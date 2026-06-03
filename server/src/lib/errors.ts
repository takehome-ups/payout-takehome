export class DomainError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new DomainError('NOT_FOUND', 404, `${what} not found`);
export const insufficientFunds = () => new DomainError('INSUFFICIENT_FUNDS', 402, 'insufficient funds');
export const lossLimitReached = () => new DomainError('LOSS_LIMIT', 403, 'daily loss limit reached');
export const badRequest = (message: string) => new DomainError('BAD_REQUEST', 400, message);
