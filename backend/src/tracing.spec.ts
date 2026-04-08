describe('tracing (entrada)', () => {
  it('invoca registerOpenTelemetry ao carregar o módulo', () => {
    const registerOpenTelemetry = jest.fn();
    jest.isolateModules(() => {
      jest.doMock('./telemetry/tracing-register', () => ({
        registerOpenTelemetry,
      }));
      require('./tracing');
    });
    expect(registerOpenTelemetry).toHaveBeenCalledTimes(1);
  });
});
