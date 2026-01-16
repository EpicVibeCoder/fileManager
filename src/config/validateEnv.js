const fs = require('fs');
const path = require('path');

const validateEnv = () => {
  // Detect if running in Docker
  const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER === 'true';
  const envPath = path.join(process.cwd(), '.env');
  const envFileExists = fs.existsSync(envPath);

  // Only require .env file if not in Docker (Docker uses env_file or environment section)
  if (!envFileExists && !isDocker) {
    console.error('\n❌ .env file is missing!');
    console.error(`   Expected location: ${envPath}`);
    console.error('\n⚠️  Please create a .env file in the project root');
    console.error('   You can copy .env.example and update the values:');
    console.error('   cp .env.example .env\n');
    process.exit(1);
  }

  // Required environment variables
  const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
  const recommendedEnvVars = ['PORT', 'NODE_ENV'];
  const googleOAuthVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'];
  // Email configuration (optional - if any SMTP var is set, all should be set)
  const emailVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];

  const missingRequired = [];
  const invalidValues = [];

  // Check required variables
  requiredEnvVars.forEach((varName) => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missingRequired.push(varName);
    } else if (varName === 'JWT_SECRET' && value === 'your-super-secret-jwt-key-change-this-in-production') {
      invalidValues.push({
        name: varName,
        message: 'JWT_SECRET must be changed from the default placeholder value',
      });
    }
  });

  // Validate Google OAuth variables (if any are set, all must be set and valid)
  const googleVarsSet = googleOAuthVars.filter((varName) => process.env[varName] && process.env[varName].trim() !== '');

  if (googleVarsSet.length > 0 && googleVarsSet.length < googleOAuthVars.length) {
    const missingGoogleVars = googleOAuthVars.filter((varName) => !process.env[varName] || process.env[varName].trim() === '');
    console.error('\n❌ Google OAuth configuration incomplete:');
    console.error('   If you set any Google OAuth variable, all must be set:');
    missingGoogleVars.forEach((varName) => {
      console.error(`   - Missing: ${varName}`);
    });
    console.error('\n⚠️  Please set all Google OAuth variables or remove them all');
    console.error('   These are required for Phase 4 (Google OAuth)\n');
    process.exit(1);
  }

  // Check for Google OAuth placeholder values
  if (googleVarsSet.length > 0) {
    googleOAuthVars.forEach((varName) => {
      const value = process.env[varName];
      if (value) {
        if (varName === 'GOOGLE_CLIENT_ID' && value === 'your-google-client-id') {
          invalidValues.push({
            name: varName,
            message: 'GOOGLE_CLIENT_ID must be changed from the default placeholder value',
          });
        }
        if (varName === 'GOOGLE_CLIENT_SECRET' && value === 'your-google-client-secret') {
          invalidValues.push({
            name: varName,
            message: 'GOOGLE_CLIENT_SECRET must be changed from the default placeholder value',
          });
        }
      }
    });
  }

  // Validate Email configuration (optional but warn if not configured)
  const emailVarsSet = emailVars.filter((varName) => process.env[varName]?.trim());

  // Warn if no email configuration is set
  if (emailVarsSet.length === 0) {
    console.warn('\n⚠️  Email configuration not set:');
    console.warn('   SMTP variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) are not configured.');
    console.warn('   Email functionality (password reset OTP) will NOT work.');
    console.warn('   OTP will be logged to console in development mode only.');
    console.warn('   To enable email, configure SMTP variables in your .env file.\n');
  } else if (emailVarsSet.length > 0 && emailVarsSet.length < emailVars.length) {
    // Warn if email configuration is incomplete
    const missingEmailVars = emailVars.filter((varName) => !process.env[varName]?.trim());
    console.warn('\n⚠️  Email configuration incomplete:');
    console.warn('   If you set any SMTP variable, all should be set for email functionality:');
    missingEmailVars.forEach((varName) => {
      console.warn(`   - Missing: ${varName}`);
    });
    console.warn('   Email sending will NOT work. OTP will be logged to console.\n');
  }

  // Check for email placeholder values
  if (emailVarsSet.length > 0) {
    if (process.env.SMTP_USER === 'your-email@gmail.com') {
      console.warn('⚠️  SMTP_USER appears to be a placeholder value. Email may not work correctly.\n');
    }
    if (process.env.SMTP_PASS === 'your-app-password') {
      console.warn('⚠️  SMTP_PASS appears to be a placeholder value. Email may not work correctly.\n');
    }
  }

  // Exit if required variables are missing
  if (missingRequired.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missingRequired.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    const envHint = isDocker ? 'docker-compose.yml environment section' : '.env file';
    console.error(`\n⚠️  Please set these variables in your ${envHint}`);
    console.error('   See .env.example for reference\n');
    process.exit(1);
  }

  // Exit if invalid values detected
  if (invalidValues.length > 0) {
    console.error('\n❌ Invalid environment variable values:');
    invalidValues.forEach(({ name, message }) => {
      console.error(`   - ${name}: ${message}`);
    });
    const envHint = isDocker ? 'docker-compose.yml environment section' : '.env file';
    console.error(`\n⚠️  Please update these variables in your ${envHint}`);
    console.error('   See .env.example for reference\n');
    process.exit(1);
  }

  // Warn about recommended variables
  const missingRecommended = recommendedEnvVars.filter((varName) => !process.env[varName] || process.env[varName].trim() === '');
  if (missingRecommended.length > 0) {
    console.warn('\n⚠️  Recommended environment variables not set (using defaults):');
    missingRecommended.forEach((varName) => {
      console.warn(`   - ${varName}`);
    });
    console.warn('   Consider setting these in your .env file\n');
  }
};

module.exports = validateEnv;
