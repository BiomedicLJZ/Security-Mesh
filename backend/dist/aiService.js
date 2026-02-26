"use strict";
/**
 * Simulated AI Cataloging Service
 * In a real system this would call an LLM/ML model.
 * Here we use deterministic keyword-matching logic so no paid API is needed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyType = classifyType;
exports.assignSeverity = assignSeverity;
exports.calculateRiskScore = calculateRiskScore;
exports.generateSummary = generateSummary;
exports.catalogIncident = catalogIncident;
// Keyword maps for incident classification
const TYPE_KEYWORDS = {
    fire: ['fire', 'flame', 'smoke', 'burning', 'blaze', 'arson'],
    intrusion: ['intruder', 'intrusion', 'break', 'trespassing', 'unauthorized', 'breach', 'burglar'],
    medical: ['medical', 'injury', 'hurt', 'ambulance', 'health', 'cardiac', 'collapse', 'overdose'],
    hazmat: ['hazmat', 'chemical', 'toxic', 'spill', 'leak', 'radiation', 'biological', 'gas'],
    traffic: ['traffic', 'accident', 'collision', 'vehicle', 'crash', 'road', 'car', 'truck'],
    cyber: ['cyber', 'hack', 'malware', 'ransomware', 'ddos', 'phishing', 'network', 'data breach'],
    natural_disaster: ['earthquake', 'flood', 'storm', 'tornado', 'hurricane', 'wildfire', 'tsunami', 'disaster'],
    unknown: [],
};
// Severity keyword boosters
const HIGH_KEYWORDS = ['critical', 'severe', 'massive', 'multiple', 'casualties', 'armed', 'explosion', 'widespread'];
const MEDIUM_KEYWORDS = ['significant', 'moderate', 'several', 'spreading', 'suspicious'];
/**
 * Classify incident type from title + description text.
 */
function classifyType(text) {
    const lower = text.toLowerCase();
    let bestType = 'unknown';
    let bestScore = 0;
    for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
        const score = keywords.filter(kw => lower.includes(kw)).length;
        if (score > bestScore) {
            bestScore = score;
            bestType = type;
        }
    }
    return bestType;
}
/**
 * Assign severity based on text content.
 */
function assignSeverity(text, type) {
    const lower = text.toLowerCase();
    const highCount = HIGH_KEYWORDS.filter(kw => lower.includes(kw)).length;
    const medCount = MEDIUM_KEYWORDS.filter(kw => lower.includes(kw)).length;
    // Certain incident types default to higher severity
    if (type === 'hazmat' || type === 'natural_disaster') {
        if (highCount > 0)
            return 'CRITICAL';
        return 'HIGH';
    }
    if (type === 'cyber' || type === 'intrusion') {
        if (highCount > 0)
            return 'CRITICAL';
        if (medCount > 0)
            return 'HIGH';
        return 'MEDIUM';
    }
    if (highCount >= 2)
        return 'CRITICAL';
    if (highCount === 1)
        return 'HIGH';
    if (medCount >= 1)
        return 'MEDIUM';
    return 'LOW';
}
/**
 * Calculate a numeric risk score (0-100).
 */
function calculateRiskScore(severity, type) {
    const severityBase = {
        CRITICAL: 85,
        HIGH: 65,
        MEDIUM: 40,
        LOW: 15,
    };
    // Type modifier adds a small variance so scores differ between incidents of the same severity
    const typeModifier = {
        fire: 8,
        intrusion: 5,
        medical: 6,
        hazmat: 12,
        traffic: 3,
        cyber: 9,
        natural_disaster: 14,
        unknown: 0,
    };
    const base = severityBase[severity];
    const modifier = typeModifier[type];
    // Add small deterministic jitter based on type string length to avoid identical scores
    const jitter = (type.length * 3) % 7;
    return Math.min(100, base + modifier + jitter);
}
/**
 * Generate a human-readable AI summary.
 */
function generateSummary(title, description, type, severity) {
    const typeLabels = {
        fire: 'Fire/Smoke event',
        intrusion: 'Security Intrusion',
        medical: 'Medical Emergency',
        hazmat: 'Hazardous Materials Incident',
        traffic: 'Traffic/Vehicle Incident',
        cyber: 'Cyber Security Threat',
        natural_disaster: 'Natural Disaster Event',
        unknown: 'Unclassified Incident',
    };
    const label = typeLabels[type];
    const sevLabel = severity === 'CRITICAL' ? 'a CRITICAL' : severity === 'HIGH' ? 'a HIGH-priority' : severity === 'MEDIUM' ? 'a MEDIUM-priority' : 'a LOW-priority';
    return `AI Analysis: Classified as ${sevLabel} ${label}. ` +
        `Title "${title}" suggests ${type} characteristics. ` +
        `Immediate ${severity === 'CRITICAL' || severity === 'HIGH' ? 'emergency response recommended' : 'monitoring advised'}. ` +
        `Mesh relay active for real-time tracking.`;
}
/**
 * Master function: run full AI cataloging on raw incident input.
 */
function catalogIncident(title, description, providedType) {
    const combinedText = `${title} ${description}`;
    const type = providedType && providedType !== 'unknown' ? providedType : classifyType(combinedText);
    const severity = assignSeverity(combinedText, type);
    const riskScore = calculateRiskScore(severity, type);
    const aiSummary = generateSummary(title, description, type, severity);
    return { type, severity, riskScore, aiSummary };
}
