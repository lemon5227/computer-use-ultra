export class InvalidJevAnswerError extends Error {
    code = 'INVALID_JEV_ANSWER';
    constructor(message) {
        super(message);
        this.name = 'InvalidJevAnswerError';
        this.cause = { code: this.code };
    }
}
//# sourceMappingURL=classifier.js.map