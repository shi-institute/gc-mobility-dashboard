import('./main.tsx')
  .then(() => {
    console.log('Greenville Connects Mobility Dashboard loaded successfully.');
  })
  .catch((error) => {
    console.error('Failed to load Greenville Connects Mobility Dashboard:', error);
  });
