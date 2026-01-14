const fs = require('fs');
const path = require('path');

const validateEnv = () => {
  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('\n❌ .env file is missing!');
    console.error(`   Expected location: ${envPath}`);
    console.error('\n⚠️  Please create a .env file in the project root');
    console.error('   You can copy .env.example and update the values:');
    console.error('   cp .env.example .env\n');
    process.exit(1);
  }

  // Required environment variables
  const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
  
  // Recommended environment variables (with defaults but should be set)
  const recommendedEnvVars = ['PORT', 'NODE_ENV'];
  
  // Optional environment variables (for future phases - commented out for now)
  const googleOAuthVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
  ];

  const missingRequired = [];
  const invalidValues = [];

  // Check required variables
  requiredEnvVars.forEach((varName) => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missingRequired.push(varName);
    } else {
      // Check for default placeholder values
      if (varName === 'JWT_SECRET' && value === 'your-super-secret-jwt-key-change-this-in-production') {
        invalidValues.push({
          name: varName,
          message: 'JWT_SECRET must be changed from the default placeholder value',
        });
      }
    }
  });

  // // Validate Google OAuth variables (if any are set, all must be set and valid)
  // const googleVarsSet = googleOAuthVars.filter(
  //   (varName) => process.env[varName] && process.env[varName].trim() !== ''
  // );

  // if (googleVarsSet.length > 0 && googleVarsSet.length < googleOAuthVars.length) {
  //   const missingGoogleVars = googleOAuthVars.filter(
  //     (varName) => !process.env[varName] || process.env[varName].trim() === ''
  //   );
  //   console.error('\n❌ Google OAuth configuration incomplete:');
  //   console.error('   If you set any Google OAuth variable, all must be set:');
  //   missingGoogleVars.forEach((varName) => {
  //     console.error(`   - Missing: ${varName}`);
  //   });
  //   console.error('\n⚠️  Please set all Google OAuth variables or remove them all');
  //   console.error('   These are required for Phase 4 (Google OAuth)\n');
  //   process.exit(1);
  // }

  // // Check for Google OAuth placeholder values
  // if (googleVarsSet.length > 0) {
  //   googleOAuthVars.forEach((varName) => {
  //     const value = process.env[varName];
  //     if (value) {
  //       if (varName === 'GOOGLE_CLIENT_ID' && value === 'your-google-client-id') {
  //         invalidValues.push({
  //           name: varName,
  //           message: 'GOOGLE_CLIENT_ID must be changed from the default placeholder value',
  //         });
  //       }
  //       if (varName === 'GOOGLE_CLIENT_SECRET' && value === 'your-google-client-secret') {
  //         invalidValues.push({
  //           name: varName,
  //           message: 'GOOGLE_CLIENT_SECRET must be changed from the default placeholder value',
  //         });
  //       }
  //     }
  //   });
  // }

  // Exit if required variables are missing
  if (missingRequired.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missingRequired.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\n⚠️  Please set these variables in your .env file');
    console.error('   See .env.example for reference\n');
    process.exit(1);
  }

  // Exit if invalid values detected
  if (invalidValues.length > 0) {
    console.error('\n❌ Invalid environment variable values:');
    invalidValues.forEach(({ name, message }) => {
      console.error(`   - ${name}: ${message}`);
    });
    console.error('\n⚠️  Please update these variables in your .env file');
    console.error('   See .env.example for reference\n');
    process.exit(1);
  }

  // Warn about recommended variables
  const missingRecommended = recommendedEnvVars.filter(
    (varName) => !process.env[varName] || process.env[varName].trim() === ''
  );
  if (missingRecommended.length > 0) {
    console.warn('\n⚠️  Recommended environment variables not set (using defaults):');
    missingRecommended.forEach((varName) => {
      console.warn(`   - ${varName}`);
    });
    console.warn('   Consider setting these in your .env file\n');
  }
};

module.exports = validateEnv;