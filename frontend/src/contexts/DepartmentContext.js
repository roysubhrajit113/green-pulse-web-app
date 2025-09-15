import React, { createContext, useContext, useState, useEffect } from 'react';
import { useInstitute } from './InstituteContext'; // Import institute context

const DepartmentContext = createContext();

export const useDepartment = () => {
  const context = useContext(DepartmentContext);
  if (!context) {
    // Return fallback data instead of throwing error
    return {
      departments: [],
      loading: false,
      error: null,
      getDepartmentById: () => null,
      getDepartmentByBuildingId: () => null,
      getDepartmentByCode: () => null,
      getDepartmentStats: () => ({ 
        totalDepartments: 0, 
        totalStudents: 0, 
        totalFaculty: 0, 
        totalEnergyCapacity: 0, 
        totalCurrentConsumption: 0, 
        totalSquareFeet: 0,
        averageEfficiency: 0,
        institute: 'N/A'
      }),
      getEnergyConsumptionByDepartment: () => [],
      updateDepartmentConsumption: () => {},
      getTopEnergyConsumers: () => [],
      getMostEfficientDepartments: () => [],
      getDepartmentsByPrimaryUse: () => [],
      refreshDepartments: () => {}
    };
  }
  return context;
};

// API service functions for departments
const departmentAPI = {
  // Fetch buildings for specific institute
  async fetchBuildingsByInstitute(instituteName) {
    try {
      console.log('Fetching buildings for institute:', instituteName);
      const response = await fetch(`http://localhost:5000/api/buildings?institute=${encodeURIComponent(instituteName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Buildings fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Error fetching buildings:', error);
      throw error;
    }
  },

  // Fetch meter data for specific building IDs
  async fetchMeterDataForBuildings(buildingIds) {
    try {
      console.log('Fetching meter data for buildings:', buildingIds);
      const response = await fetch(`http://localhost:5000/api/meter-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ building_ids: buildingIds }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Meter data fetched successfully');
      return data;
    } catch (error) {
      console.error('Error fetching meter data:', error);
      throw error;
    }
  },

  // Fetch latest meter readings for buildings
  async fetchLatestMeterReadings(buildingIds) {
    try {
      const response = await fetch(`http://localhost:5000/api/meter-data/latest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ building_ids: buildingIds }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching latest meter readings:', error);
      throw error;
    }
  }
};

export const DepartmentProvider = ({ children }) => {
  const { currentInstitute } = useInstitute(); // Get current institute
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Predefined department colors and additional info
  const departmentColors = [
    '#4318FF', '#6AD2FF', '#4CAF50', '#FF9800', '#9C27B0',
    '#F44336', '#00BCD4', '#795548', '#607D8B', '#FF6B6B',
    '#2196F3', '#8BC34A', '#FFC107', '#E91E63', '#009688'
  ];

  // Indian names for department heads
  const indianHeads = [
    'Dr. Rajesh Kumar', 'Prof. Priya Sharma', 'Dr. Arjun Patel', 'Prof. Meera Singh',
    'Dr. Vikram Gupta', 'Prof. Kavita Reddy', 'Dr. Anil Verma', 'Prof. Sunita Joshi',
    'Dr. Rahul Agarwal', 'Prof. Deepika Nair', 'Dr. Sanjay Mishra', 'Prof. Ritu Chopra',
    'Dr. Manoj Tiwari', 'Prof. Neha Pandey', 'Dr. Ashish Srivastava', 'Prof. Pooja Gupta',
    'Dr. Suresh Kumar', 'Prof. Anjali Sharma', 'Dr. Ramesh Singh', 'Prof. Divya Patel'
  ];

  // Calculate energy consumption from meter readings (sum of last 24 hours)
  const calculateConsumption = (meterReadings) => {
    if (!meterReadings || meterReadings.length === 0) return 0;
    
    // Get readings from last 24 hours and sum them
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    const recentReadings = meterReadings.filter(reading => {
      const readingTime = new Date(reading.timestamp);
      return readingTime >= last24Hours;
    });

    return recentReadings.reduce((sum, reading) => sum + (reading.meter_reading || 0), 0);
  };

  // Calculate efficiency percentage based on consumption vs estimated capacity
  const calculateEfficiency = (currentConsumption, capacity, squareFeet) => {
    if (!capacity || capacity === 0) {
      // Estimate capacity based on building size if not provided
      const estimatedCapacity = squareFeet * 0.05; // 0.05 kWh per sq ft per day
      return currentConsumption > 0 ? Math.min(Math.round((estimatedCapacity / currentConsumption) * 100), 100) : 100;
    }
    return currentConsumption > 0 ? Math.min(Math.round((capacity / currentConsumption) * 100), 100) : 100;
  };

  // Generate student and faculty counts based on building type and size
  const generateCounts = (primaryUse, squareFeet) => {
    const baseMultiplier = squareFeet / 10000; // Base on building size
    
    switch (primaryUse.toLowerCase()) {
      case 'education':
      case 'office':
        return {
          studentCount: Math.round(baseMultiplier * 200),
          facultyCount: Math.round(baseMultiplier * 15)
        };
      case 'lodging/residential':
      case 'residential':
        return {
          studentCount: Math.round(baseMultiplier * 100),
          facultyCount: 0
        };
      case 'entertainment/public assembly':
      case 'public assembly':
        return {
          studentCount: 0,
          facultyCount: Math.round(baseMultiplier * 5)
        };
      case 'healthcare':
        return {
          studentCount: Math.round(baseMultiplier * 50),
          facultyCount: Math.round(baseMultiplier * 20)
        };
      case 'laboratory':
        return {
          studentCount: Math.round(baseMultiplier * 80),
          facultyCount: Math.round(baseMultiplier * 25)
        };
      case 'parking':
        return {
          studentCount: 0,
          facultyCount: 0
        };
      default:
        return {
          studentCount: Math.round(baseMultiplier * 50),
          facultyCount: Math.round(baseMultiplier * 10)
        };
    }
  };

  // Convert buildings to departments with real data
  const convertBuildingsToDepartments = (buildings, meterData) => {
    return buildings.map((building, index) => {
      const buildingMeterData = meterData.filter(data => data.building_id === building.building_id);
      const currentConsumption = calculateConsumption(buildingMeterData);
      const estimatedCapacity = building.square_feet * 0.06; // Estimate capacity
      const efficiency = calculateEfficiency(currentConsumption, estimatedCapacity, building.square_feet);
      const { studentCount, facultyCount } = generateCounts(building.primary_use, building.square_feet);

      return {
        id: `dept_${building.building_id}`,
        name: building.assigned_name,
        code: building.primary_use.substring(0, 3).toUpperCase(),
        building: building.assigned_name,
        building_id: building.building_id,
        primary_use: building.primary_use,
        floorCount: Math.max(1, Math.ceil(building.square_feet / 20000)), // Estimate floors
        square_feet: building.square_feet,
        year_built: building.year_built,
        energyCapacity: Math.round(estimatedCapacity),
        currentConsumption: Math.round(currentConsumption),
        efficiency: efficiency,
        headOfDept: indianHeads[index % indianHeads.length],
        studentCount: studentCount,
        facultyCount: facultyCount,
        color: departmentColors[index % departmentColors.length],
        latitude: building.latitude,
        longitude: building.longitude,
        city: building.city,
        institute: building.institute,
        campus_id: building.campus_id
      };
    });
  };

  // Load departments data from database based on current institute
  useEffect(() => {
    const loadDepartments = async () => {
      if (!currentInstitute) {
        console.log('No current institute selected, clearing departments');
        setDepartments([]);
        setLoading(false);
        return;
      }

      try {
        console.log('Loading departments for institute:', currentInstitute.name);
        setLoading(true);
        setError(null);
        
        // Fetch buildings for current institute
        const buildingsResponse = await departmentAPI.fetchBuildingsByInstitute(currentInstitute.name);
        const buildings = buildingsResponse.buildings || buildingsResponse.data || buildingsResponse || [];

        if (!buildings || buildings.length === 0) {
          console.log('No buildings found for institute:', currentInstitute.name);
          setDepartments([]);
          setLoading(false);
          return;
        }

        console.log(`Found ${buildings.length} buildings for ${currentInstitute.name}`);

        // Get building IDs
        const buildingIds = buildings.map(building => building.building_id);
        
        // Fetch meter data for these buildings
        const meterDataResponse = await departmentAPI.fetchMeterDataForBuildings(buildingIds);
        const meterData = meterDataResponse.meterData || meterDataResponse.data || meterDataResponse || [];

        // Convert buildings to departments with real data
        const departmentsData = convertBuildingsToDepartments(buildings, meterData);
        setDepartments(departmentsData);

        console.log(`Successfully loaded ${departmentsData.length} departments`);

      } catch (error) {
        console.error('Error loading departments:', error);
        setError(error.message);
        // Set empty departments on error
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    };

    loadDepartments();
  }, [currentInstitute]); // Reload when institute changes

  // Get department by ID
  const getDepartmentById = (departmentId) => {
    return departments.find(dept => dept.id === departmentId);
  };

  // Get department by building ID
  const getDepartmentByBuildingId = (buildingId) => {
    return departments.find(dept => dept.building_id === buildingId);
  };

  // Get department by code
  const getDepartmentByCode = (code) => {
    return departments.find(dept => dept.code === code);
  };

  // Get department statistics
  const getDepartmentStats = () => {
    const totalDepartments = departments.length;
    const totalStudents = departments.reduce((sum, dept) => sum + dept.studentCount, 0);
    const totalFaculty = departments.reduce((sum, dept) => sum + dept.facultyCount, 0);
    const totalEnergyCapacity = departments.reduce((sum, dept) => sum + dept.energyCapacity, 0);
    const totalCurrentConsumption = departments.reduce((sum, dept) => sum + dept.currentConsumption, 0);
    const totalSquareFeet = departments.reduce((sum, dept) => sum + dept.square_feet, 0);
    const averageEfficiency = departments.length > 0 
      ? departments.reduce((sum, dept) => sum + dept.efficiency, 0) / departments.length 
      : 0;

    return {
      totalDepartments,
      totalStudents,
      totalFaculty,
      totalEnergyCapacity,
      totalCurrentConsumption,
      totalSquareFeet,
      averageEfficiency: Math.round(averageEfficiency),
      institute: currentInstitute?.name || 'N/A'
    };
  };

  // Get energy consumption by department
  const getEnergyConsumptionByDepartment = () => {
    return departments.map(dept => ({
      name: dept.name,
      consumption: dept.currentConsumption,
      capacity: dept.energyCapacity,
      efficiency: dept.efficiency,
      color: dept.color,
      primary_use: dept.primary_use,
      square_feet: dept.square_feet
    }));
  };

  // Update department energy consumption (for real-time updates)
  const updateDepartmentConsumption = async (departmentId, newConsumption) => {
    setDepartments(prevDepartments =>
      prevDepartments.map(dept =>
        dept.id === departmentId
          ? {
              ...dept,
              currentConsumption: newConsumption,
              efficiency: calculateEfficiency(newConsumption, dept.energyCapacity, dept.square_feet)
            }
          : dept
      )
    );
  };

  // Get top energy consuming departments
  const getTopEnergyConsumers = (limit = 5) => {
    return departments
      .sort((a, b) => b.currentConsumption - a.currentConsumption)
      .slice(0, limit);
  };

  // Get most efficient departments
  const getMostEfficientDepartments = (limit = 5) => {
    return departments
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, limit);
  };

  // Get departments by primary use
  const getDepartmentsByPrimaryUse = (primaryUse) => {
    return departments.filter(dept => 
      dept.primary_use.toLowerCase().includes(primaryUse.toLowerCase())
    );
  };

  // Refresh departments data
  const refreshDepartments = async () => {
    if (!currentInstitute) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const buildingsResponse = await departmentAPI.fetchBuildingsByInstitute(currentInstitute.name);
      const buildings = buildingsResponse.buildings || buildingsResponse.data || buildingsResponse || [];

      if (buildings && buildings.length > 0) {
        const buildingIds = buildings.map(building => building.building_id);
        const meterDataResponse = await departmentAPI.fetchMeterDataForBuildings(buildingIds);
        const meterData = meterDataResponse.meterData || meterDataResponse.data || meterDataResponse || [];
        
        const departmentsData = convertBuildingsToDepartments(buildings, meterData);
        setDepartments(departmentsData);
      } else {
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error refreshing departments:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    departments,
    loading,
    error,
    getDepartmentById,
    getDepartmentByBuildingId,
    getDepartmentByCode,
    getDepartmentStats,
    getEnergyConsumptionByDepartment,
    updateDepartmentConsumption,
    getTopEnergyConsumers,
    getMostEfficientDepartments,
    getDepartmentsByPrimaryUse,
    refreshDepartments
  };

  return (
    <DepartmentContext.Provider value={value}>
      {children}
    </DepartmentContext.Provider>
  );
};
