


export const generateInitials = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return 'U';
  }

  const names = fullName.trim().split(' ');
  
  if (names.length === 1) {

    return names[0].substring(0, 2).toUpperCase();
  } else {

    return names
      .slice(0, 2)
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase();
  }
};


export const getDisplayName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return 'User';
  }

  const names = fullName.trim().split(' ');
  return names[0];
};
