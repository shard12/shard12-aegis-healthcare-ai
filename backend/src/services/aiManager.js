/**
 * AI manager — single import surface for Express routes and services.
 * Implementation lives under ../providers/ (modular, testable units per vendor).
 */
export { generateAIResponse, hasConfiguredAiProviders, logAiProvidersStartup } from '../providers/index.js';
