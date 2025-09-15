const User = require('../models/User');
const CarbonData = require('../models/CarbonData');


const getInstituteStringId = (institute) => {
  if (!institute) return '';
  

  if (typeof institute === 'string') {
    return institute;
  }
  

  if (typeof institute === 'object') {

    if (institute.name) return institute.name;
    if (institute.campusId) return institute.campusId;  
    if (institute.id) return institute.id;
    

    return JSON.stringify(institute);
  }
  
  return String(institute);
};


const instituteFilter = async (req, res, next) => {
  try {

    if (!req.user || !req.user._id) {
      return next();
    }


    const user = await User.findById(req.user._id).select('institute');
    
    if (!user || !user.institute) {
      return res.status(400).json({
        success: false,
        message: 'User institute not found. Please contact administrator.'
      });
    }


    const instituteString = getInstituteStringId(user.institute);
    
    console.log('🔍 Institute middleware - providing both formats:', {
      stringVersion: instituteString,
      stringType: typeof instituteString,
      objectVersion: user.institute,
      objectType: typeof user.institute
    });


    req.userInstitute = instituteString; 
    req.instituteIdentifier = CarbonData.getInstituteIdentifier(instituteString);
    

    req.userInstituteObject = user.institute;
    req.instituteDetails = user.institute;
    req.originalInstitute = user.institute;
    
    next();
  } catch (error) {
    console.error('Institute filter middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing institute authorization'
    });
  }
};


const requireSameInstitute = (req, res, next) => {

  if (!req.instituteIdentifier) {
    return res.status(400).json({
      success: false,
      message: 'Institute authorization required'
    });
  }
  

  const requestedInstitute = req.query.institute || req.body.institute || req.params.institute;
  
  if (requestedInstitute) {
    const requestedInstituteId = CarbonData.getInstituteIdentifier(requestedInstitute);
    
    if (requestedInstituteId !== req.instituteIdentifier) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access data from your own institute'
      });
    }
  }
  
  next();
};


const createInstituteFilter = (userInstitute) => {
  if (!userInstitute) return {};
  
  const instituteId = CarbonData.getInstituteIdentifier(userInstitute);
  

  if (typeof userInstitute === 'string') {
    return {
      $or: [
        { 'institute': userInstitute },
        { 'institute': { $regex: new RegExp(`^${userInstitute}$`, 'i') } }
      ]
    };
  } else if (typeof userInstitute === 'object' && userInstitute.name) {
    return {
      $or: [
        { 'institute.name': userInstitute.name },
        { 'institute.name': { $regex: new RegExp(`^${userInstitute.name}$`, 'i') } },
        { 'institute': userInstitute.name },
        { 'institute': { $regex: new RegExp(`^${userInstitute.name}$`, 'i') } }
      ]
    };
  } else if (typeof userInstitute === 'object' && userInstitute.id) {
    return {
      $or: [
        { 'institute.id': userInstitute.id },
        { 'institute': userInstitute.id }
      ]
    };
  }
  
  return { 'institute': userInstitute };
};


const getInstituteDisplayName = (institute) => {
  if (!institute) return 'Unknown Institute';
  
  if (typeof institute === 'string') {
    return institute;
  } else if (typeof institute === 'object' && institute.name) {
    return institute.name;
  } else if (typeof institute === 'object' && institute.id) {
    return institute.id;
  }
  
  return String(institute);
};


const validateInstituteAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    

    const isAdmin = user.position === 'Admin' || user.position === 'Administrator' || user.email.includes('admin');
    
    if (!isAdmin) {

      const instituteString = getInstituteStringId(user.institute);
      

      req.userInstitute = instituteString;
      req.userInstituteObject = user.institute;
      req.instituteIdentifier = CarbonData.getInstituteIdentifier(instituteString);
      req.isAdmin = false;
    } else {

      req.isAdmin = true;
    }
    
    next();
  } catch (error) {
    console.error('Institute access validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating institute access'
    });
  }
};

module.exports = {
  instituteFilter,
  requireSameInstitute,
  createInstituteFilter,
  getInstituteDisplayName,
  validateInstituteAccess,
  getInstituteStringId
};
