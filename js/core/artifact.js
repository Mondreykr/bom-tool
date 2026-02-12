// artifact.js - JSON Artifact Export for IFP BOMs

/**
 * Serialize a BOMNode to a plain object with all fields preserved.
 * Recursively processes children and includes ephemeral tags (_source, _changes).
 *
 * @param {Object} node - BOMNode to serialize
 * @returns {Object} - Plain object representation
 */
function serializeNode(node) {
    const obj = {
        partNumber: node.partNumber,
        componentType: node.componentType,
        description: node.description,
        material: node.material,
        qty: node.qty,
        length: node.length,
        uofm: node.uofm,
        state: node.state,
        purchaseDescription: node.purchaseDescription,
        nsItemType: node.nsItemType,
        revision: node.revision,
        children: node.children.map(child => serializeNode(child))
    };

    // Include ephemeral tags for artifact storage
    if (node._source) obj._source = node._source;
    if (node._changes) obj._changes = node._changes;

    return obj;
}

/**
 * Convert object to canonical JSON string for deterministic hashing.
 * Sorts object keys alphabetically to ensure consistent serialization.
 *
 * @param {Object} obj - Object to stringify
 * @returns {string} - Canonical JSON string
 */
function canonicalStringify(obj) {
    return JSON.stringify(obj, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value).sort().reduce((sorted, k) => {
                sorted[k] = value[k];
                return sorted;
            }, {});
        }
        return value;
    });
}

/**
 * Compute SHA-256 hash of a BOM tree.
 * Uses canonical JSON serialization for deterministic results.
 * Returns lowercase hex string (64 characters).
 *
 * @param {Object} bomTree - BOM tree to hash
 * @returns {Promise<string>} - SHA-256 hash as lowercase hex string
 */
export async function computeHash(bomTree) {
    // Serialize to canonical JSON
    const serialized = serializeNode(bomTree);
    const canonicalJson = canonicalStringify(serialized);

    // Convert to bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalJson);

    // Compute SHA-256 hash
    let hashBuffer;

    // Try Web Crypto API (works in browser and Node 15+)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        hashBuffer = await crypto.subtle.digest('SHA-256', data);
    } else {
        // Fallback for older Node.js versions
        const { createHash } = await import('crypto');
        const hash = createHash('sha256');
        hash.update(canonicalJson);
        const hexHash = hash.digest('hex');
        return hexHash;
    }

    // Convert buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

/**
 * Export a merged BOM tree as a JSON artifact.
 * Includes metadata (revision, job number, hash, source files, summary) and the full BOM tree.
 *
 * @param {Object} params - Export parameters
 * @param {Object} params.mergedTree - Merged BOM tree (root node)
 * @param {Object} params.summary - Merge summary stats {passedThrough, grafted, placeholders}
 * @param {number} params.revision - Revision number
 * @param {string} params.jobNumber - Job number (e.g., "1J258758")
 * @param {Object} params.sourceFiles - Source filenames {xn: string, bn1: string|null}
 * @param {Date} [params.date] - Generation date (defaults to now)
 * @returns {Promise<Object>} - Artifact object ready for JSON.stringify
 */
export async function exportArtifact({
    mergedTree,
    summary,
    revision,
    jobNumber,
    sourceFiles,
    date = new Date()
}) {
    // Serialize the BOM tree
    const bomSerialized = serializeNode(mergedTree);

    // Compute hash from the BOM data only (not metadata)
    const hash = await computeHash(mergedTree);

    // Build artifact
    const artifact = {
        formatVersion: '1.0',
        metadata: {
            revision: revision,
            jobNumber: jobNumber,
            generatedDate: date.toISOString(),
            hash: hash,
            sourceFiles: {
                xn: sourceFiles.xn,
                bn1: sourceFiles.bn1
            },
            summary: {
                passedThrough: summary.passedThrough,
                grafted: summary.grafted,
                placeholders: summary.placeholders
            }
        },
        bom: bomSerialized
    };

    return artifact;
}

/**
 * Generate filename for an IFP artifact.
 * Pattern: {jobNumber}-IFP REV{revision} (MMM D, YYYY).json
 *
 * @param {string} jobNumber - Job number (e.g., "1J258758")
 * @param {number} revision - Revision number
 * @param {Date} [date] - Date for filename (defaults to now)
 * @returns {string} - Filename
 */
export function generateFilename(jobNumber, revision, date = new Date()) {
    // Month names (abbreviated)
    const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const month = monthNames[date.getMonth()];
    const day = date.getDate(); // No leading zero
    const year = date.getFullYear();

    return `${jobNumber}-IFP REV${revision} (${month} ${day}, ${year}).json`;
}

/**
 * Suggest revision number based on prior artifact.
 * REV0: returns 0 (no prior artifact)
 * REV1+: returns prior revision + 1
 *
 * @param {Object|null} priorArtifact - Prior artifact (B(n-1)), or null/undefined for REV0
 * @returns {number} - Suggested revision number
 */
export function suggestRevision(priorArtifact) {
    if (!priorArtifact) {
        return 0; // REV0
    }
    return priorArtifact.metadata.revision + 1;
}

/**
 * Suggest job number based on prior artifact and root part number.
 * REV0: returns "1J" + rootPartNumber
 * REV1+: returns prior artifact's job number
 *
 * @param {Object|null} priorArtifact - Prior artifact (B(n-1)), or null/undefined for REV0
 * @param {string} rootPartNumber - Root part number from X(n)
 * @returns {string} - Suggested job number
 */
export function suggestJobNumber(priorArtifact, rootPartNumber) {
    if (!priorArtifact) {
        return '1J' + rootPartNumber; // REV0 default
    }
    return priorArtifact.metadata.jobNumber;
}
