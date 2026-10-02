import { act, render } from "@testing-library/react";
import { motion } from "framer-motion";
import { getSalahSquarePopProps } from "./constants";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const Square = ({ isPopping }: { isPopping: boolean }) => (
  <motion.div data-testid="square" {...getSalahSquarePopProps(isPopping)} />
);

describe("salah square pop", () => {
  // A square that was empty mounts in the same render that starts the pop.
  it("shrinks back after a pop that started on mount", async () => {
    const { rerender, getByTestId } = render(<Square isPopping={true} />);
    await act(() => wait(1500));
    rerender(<Square isPopping={false} />);
    await act(() => wait(1500));
    expect(getByTestId("square").style.transform).toBe("none");
  });

  it("shrinks back after a pop on a square that was already shown", async () => {
    const { rerender, getByTestId } = render(<Square isPopping={false} />);
    rerender(<Square isPopping={true} />);
    await act(() => wait(1500));
    rerender(<Square isPopping={false} />);
    await act(() => wait(1500));
    expect(getByTestId("square").style.transform).toBe("none");
  });
});
