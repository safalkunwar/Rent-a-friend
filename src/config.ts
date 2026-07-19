export const DOCS_CONFIG = {
  termsOfServiceUrl: import.meta.env.VITE_TERMS_OF_SERVICE_URL || 'https://raw.githubusercontent.com/sawfallkunwar/hamrosathi/main/docs/TERMS_OF_SERVICE.md',
  privacyPolicyUrl: import.meta.env.VITE_PRIVACY_POLICY_URL || 'https://raw.githubusercontent.com/sawfallkunwar/hamrosathi/main/docs/PRIVACY_POLICY.md',
  
  // Local fallbacks
  localTermsOfServiceUrl: '/TERMS_OF_SERVICE.md',
  localPrivacyPolicyUrl: '/PRIVACY_POLICY.md',
};
