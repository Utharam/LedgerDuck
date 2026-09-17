class AbortedError extends Error {
  constructor() {
    super('Aborted');
    this.name = 'AbortedError';
  }
}

export async function toAbortablePromise<R extends any = any>({
  promise,
  signal,
  onFinalize,
}: {
  promise: Promise<R>;
  signal: AbortSignal;
  onFinalize?: () => void | Promise<void>;
}): Promise<{ value: R; aborted: false } | { value: undefined; aborted: true }>;
export async function toAbortablePromise<
  R extends any = any,
  A extends () => any | Promise<any> = () => any | Promise<any>,
>({
  promise,
  signal,
  onAbort,
  onFinalize,
}: {
  promise: Promise<R>;
  signal: AbortSignal;
  onAbort: A;
  onFinalize?: () => void | Promise<void>;
}): Promise<
  A extends () => Promise<infer AR>
    ? { value: R; aborted: false } | { value: AR; aborted: true }
    : A extends () => infer AR
      ? { value: R; aborted: false } | { value: AR; aborted: true }
      : never
>;
export async function toAbortablePromise<R extends any = any, A extends () => any = () => any>({
  promise,
  signal,
  onAbort,
  onFinalize,
}: {
  promise: Promise<R>;
  signal: AbortSignal;
  onAbort?: A;
  onFinalize?: () => void | Promise<void>;
}) {
  // Fast-path: already aborted — don't wait on the wrapped promise.
  if (signal.aborted) {
    return { value: (await onAbort?.()) || undefined, aborted: true } as any;
  }
  let onAbortListener: (() => void) | undefined;
  try {
    const ret = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        onAbortListener = () => {
          reject(new AbortedError());
        };
        signal.addEventListener('abort', onAbortListener, { once: true });
      }),
    ]);

    return { value: ret, aborted: false };
  } catch (error) {
    if (error instanceof AbortedError) {
      return { value: (await onAbort?.()) || undefined, aborted: true };
    }
    throw error;
  } finally {
    if (onAbortListener) {
      signal.removeEventListener('abort', onAbortListener);
    }
    await onFinalize?.();
  }
}
