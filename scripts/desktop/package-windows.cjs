const { X509Certificate } = require('node:crypto');

function publisherFromCertificate(encoded) {
    if (!encoded) throw new Error('The Windows signing certificate is required for release packaging.');
    const certificate = new X509Certificate(Buffer.from(encoded, 'base64'));
    const publisher = certificate.toLegacyObject().subject.CN;
    if (typeof publisher !== 'string' || !publisher) throw new Error('The Windows signing certificate must have a common name.');
    return publisher;
}

module.exports = { publisherFromCertificate };
