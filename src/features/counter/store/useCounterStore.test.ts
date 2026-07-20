import { useCounterStore } from "./useCounterStore";

describe("useCounterStore", () => {
  beforeEach(() => {
    useCounterStore.setState({ count: 0 });
  });

  it("should have initial count of 0", () => {
    const { count } = useCounterStore.getState();
    expect(count).toBe(0);
  });

  it("should increment count", () => {
    useCounterStore.getState().increment();
    expect(useCounterStore.getState().count).toBe(1);
  });

  it("should decrement count", () => {
    useCounterStore.getState().decrement();
    expect(useCounterStore.getState().count).toBe(-1);
  });

  it("should reset count", () => {
    useCounterStore.getState().increment();
    useCounterStore.getState().reset();
    expect(useCounterStore.getState().count).toBe(0);
  });
});
