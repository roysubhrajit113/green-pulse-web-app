import React, { createContext, useContext, useState, useEffect } from 'react';

const InstituteContext = createContext();

export const useInstitute = () => {
  const context = useContext(InstituteContext);
  if (!context) {
    throw new Error('useInstitute must be used within an InstituteProvider');
  }
  return context;
};


const instituteAPI = {

  async fetchInstitutes() {
    try {
      console.log('Attempting to fetch institutes from API...');
      const response = await fetch('http://localhost:5000/api/institutes', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      console.log('API Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Institutes fetched successfully:', data.length, 'institutes found');
      return data;
    } catch (error) {
      console.error('Error fetching institutes:', error);
      throw error;
    }
  },


  async fetchInstituteById(id) {
    try {
      const response = await fetch(`http://localhost:5000/api/institutes/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching institute:', error);
      throw error;
    }
  },


  async updateInstitute(id, updates) {
    try {
      const response = await fetch(`http://localhost:5000/api/institutes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating institute:', error);
      throw error;
    }
  },


  async addInstitute(instituteData) {
    try {
      const response = await fetch('http://localhost:5000/api/institutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(instituteData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error adding institute:', error);
      throw error;
    }
  },


  async deleteInstitute(id) {
    try {
      const response = await fetch(`http://localhost:5000/api/institutes/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting institute:', error);
      throw error;
    }
  }
};

export const InstituteProvider = ({ children }) => {
  const [currentInstitute, setCurrentInstitute] = useState(null);
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    const loadInstitutes = async () => {
      try {
        console.log('Starting to load institutes...');
        setLoading(true);
        setError(null);
        

        console.log('Calling fetchInstitutes API...');
        const data = await instituteAPI.fetchInstitutes();
        
        if (!data || !Array.isArray(data)) {
          console.error('Invalid data format received:', data);
          throw new Error('Invalid data format received from API');
        }
        
        console.log(`Successfully loaded ${data.length} institutes`);
        setInstitutes(data);
        

        const savedInstituteId = localStorage.getItem('greenpulse_current_institute');
        console.log('Saved institute ID from localStorage:', savedInstituteId);
        
        if (savedInstituteId && data.length > 0) {
          const institute = data.find(inst => inst.id === savedInstituteId);
          if (institute) {
            console.log('Found saved institute:', institute.name);
            setCurrentInstitute(institute);
          } else {
            console.log('Saved institute not found, using first institute as default');

            setCurrentInstitute(data[0]);
            localStorage.setItem('greenpulse_current_institute', data[0].id);
          }
        } else if (data.length > 0) {
          console.log('No saved institute, using first institute as default');

          setCurrentInstitute(data[0]);
          localStorage.setItem('greenpulse_current_institute', data[0].id);
        } else {
          console.log('No institutes available');
        }
      } catch (error) {
        console.error('Error loading institutes:', error);
        setError(error.message || 'Failed to load institutes');
      } finally {
        setLoading(false);
        console.log('Institute loading process completed');
      }
    };

    loadInstitutes();
  }, []);


  const selectInstitute = async (instituteId) => {
    try {
      const institute = institutes.find(inst => inst.id === instituteId);
      if (institute) {
        setCurrentInstitute(institute);
        localStorage.setItem('greenpulse_current_institute', instituteId);
      } else {

        const fetchedInstitute = await instituteAPI.fetchInstituteById(instituteId);
        setCurrentInstitute(fetchedInstitute);
        localStorage.setItem('greenpulse_current_institute', instituteId);
      }
    } catch (error) {
      console.error('Error selecting institute:', error);
      setError(error.message);
    }
  };


  const getInstituteByCampusId = (campusId) => {
    return institutes.find(inst => inst.campusId === campusId);
  };


  const getInstituteStats = () => {
    if (!currentInstitute) return null;

    return {
      totalInstitutes: institutes.length,
      currentInstitute: currentInstitute.name,
      campusId: currentInstitute.campusId,
      totalBuildings: currentInstitute.totalBuildings,
      totalStudents: currentInstitute.totalStudents,
      energyCapacity: currentInstitute.energyCapacity,
      carbonBudget: currentInstitute.carbonBudget
    };
  };


  const updateInstitute = async (instituteId, updates) => {
    try {
      setLoading(true);
      

      const updatedInstitute = await instituteAPI.updateInstitute(instituteId, updates);
      

      setInstitutes(prevInstitutes => 
        prevInstitutes.map(inst => 
          inst.id === instituteId ? { ...inst, ...updates } : inst
        )
      );


      if (currentInstitute && currentInstitute.id === instituteId) {
        setCurrentInstitute(prev => ({ ...prev, ...updates }));
      }

      return updatedInstitute;
    } catch (error) {
      console.error('Error updating institute:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };


  const addInstitute = async (instituteData) => {
    try {
      setLoading(true);
      

      const newInstitute = await instituteAPI.addInstitute({
        ...instituteData,
        established: instituteData.established || new Date().getFullYear().toString()
      });
      

      setInstitutes(prevInstitutes => [...prevInstitutes, newInstitute]);
      
      return newInstitute;
    } catch (error) {
      console.error('Error adding institute:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };


  const removeInstitute = async (instituteId) => {
    try {
      setLoading(true);
      

      await instituteAPI.deleteInstitute(instituteId);
      

      setInstitutes(prevInstitutes => 
        prevInstitutes.filter(inst => inst.id !== instituteId)
      );


      if (currentInstitute && currentInstitute.id === instituteId) {
        setCurrentInstitute(null);
        localStorage.removeItem('greenpulse_current_institute');
      }
    } catch (error) {
      console.error('Error removing institute:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };


  const refreshInstitutes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await instituteAPI.fetchInstitutes();
      setInstitutes(data);
    } catch (error) {
      console.error('Error refreshing institutes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentInstitute,
    institutes,
    loading,
    error,
    selectInstitute,
    getInstituteByCampusId,
    getInstituteStats,
    updateInstitute,
    addInstitute,
    removeInstitute,
    refreshInstitutes
  };

  return (
    <InstituteContext.Provider value={value}>
      {children}
    </InstituteContext.Provider>
  );
};
