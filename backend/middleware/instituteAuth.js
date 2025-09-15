const User = require('../models/User');
const CarbonData = require('../models/CarbonData');

/**
 * Helper function to extract institute string identifier from institute data
 */
const getInstituteStringId = (institute) => {
  if (!institute) return '';
  
  // If it's already a string, return as-is
  if (typeof institute === 'string') {
    return institute;
  }
  
  // If it's an object, extract the most appropriate string identifier
  if (typeof institute === 'object') {
    // Priority order: name > campusId > id
    if (institute.name) return institute.name;
    if (institute.campusId) return institute.campusId;  
    if (institute.id) return institute.id;
    
    // Fallback to stringified version
    return JSON.stringify(institute);
  }
  
  return String(institute);
};

/**
 * Middleware to add institute filtering to requests
 * This ensures users can only access data from their own institute
 */
const instituteFilter = async (req, res, next) => {
  try {
    // Skip if no authenticated user
    if (!req.user || !req.user._id) {
      return next();
    }

    // Get user's institute information
    const user = await User.findById(req.user._id).select('institute');
    
    if (!user || !user.institute) {
      return res.status(400).json({
        success: false,
        message: 'User institute not found. Please contact administrator.'
      });
    }

    // ✅ SAFE: Provide both formats for backward compatibility
    const instituteString = getInstituteStringId(user.institute);
    
    console.log('🔍 Institute middleware - providing both formats:', {
      stringVersion: instituteString,
      stringType: typeof instituteString,
      objectVersion: user.institute,
      objectType: typeof user.institute
    });

    // ✅ For NEW code (wallet, etc.) - use string version
    req.userInstitute = instituteString; 
    req.instituteIdentifier = CarbonData.getInstituteIdentifier(instituteString);
    
    // ✅ For EXISTING code - keep object format available
    req.userInstituteObject = user.institute;
    req.instituteDetails = user.institute; // Alternative name for clarity
    req.originalInstitute = user.institute; // Another option for legacy code
    
    next();
  } catch (error) {
    console.error('Institute filter middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing institute authorization'
    });
  }
};

/**
 * Middleware to ensure users can only access their own institute's data
 * Used for routes that fetch or modify institute-specific data
 */
const requireSameInstitute = (req, res, next) => {
  // This middleware should be used after instituteFilter
  if (!req.instituteIdentifier) {
    return res.status(400).json({
      success: false,
      message: 'Institute authorization required'
    });
  }
  
  // Check if requesting data for a specific institute (from query params or body)
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

/**
 * Helper function to create institute-specific query filter
 * @param {*} userInstitute - The user's institute object/string
 * @returns {Object} - MongoDB query filter for institute
 */
const createInstituteFilter = (userInstitute) => {
  if (!userInstitute) return {};
  
  const instituteId = CarbonData.getInstituteIdentifier(userInstitute);
  
  // Handle different institute formats for backward compatibility
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

/**
 * Helper function to get institute name for display purposes
 * @param {*} institute - Institute object or string
 * @returns {string} - Institute display name
 */
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

/**
 * Middleware to validate institute access for admin operations
 * Allows admin users to access any institute, regular users only their own
 */
const validateInstituteAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user is admin (you can modify this logic based on your admin detection)
    const isAdmin = user.position === 'Admin' || user.position === 'Administrator' || user.email.includes('admin');
    
    if (!isAdmin) {
      // For regular users, apply institute filtering
      const instituteString = getInstituteStringId(user.institute);
      
      // Provide both formats for compatibility
      req.userInstitute = instituteString;
      req.userInstituteObject = user.institute;
      req.instituteIdentifier = CarbonData.getInstituteIdentifier(instituteString);
      req.isAdmin = false;
    } else {
      // Admin users can access any institute
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
  getInstituteStringId // ✅ Export helper function
};
