export class FeatureToggle {
  static isFeatureEnabled(feature: string, userId?: string): boolean {
    const featureRollout =
      process.env[`FEATURE_${feature.toUpperCase()}_ROLLOUT`] || '100';
    const percentage = userId
      ? parseInt(userId, 10) % 100
      : Math.random() * 100;
    return percentage < parseInt(featureRollout, 10);
  }
}
