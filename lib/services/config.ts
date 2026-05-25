export function resolveApiKey(apiKeyRef: string): string {
  if (apiKeyRef.startsWith('env://')) {
    const varName = apiKeyRef.slice(6);
    const value = process.env[varName];
    if (!value) {
      throw new Error(`Environment variable ${varName} not set`);
    }
    return value;
  }
  if (apiKeyRef.startsWith('raw://')) {
    return apiKeyRef.slice(6);
  }
  if (apiKeyRef.startsWith('keychain://')) {
    throw new Error('Keychain resolution not supported');
  }
  return apiKeyRef;
}
