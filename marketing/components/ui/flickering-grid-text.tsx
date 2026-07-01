"use client";

import { cn } from "@marketing/lib/utils";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

// Convert any CSS color to an "rgba(r, g, b," prefix; opacity is appended per-square.
function getRGBAPrefix(color: string): string {
    if (typeof window === "undefined") return "rgba(0, 0, 0,";
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "rgba(180, 180, 180,";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
    return `rgba(${r}, ${g}, ${b},`;
}

interface FlickeringGridTextProps extends React.HTMLAttributes<HTMLDivElement> {
    squareSize?: number;
    gridGap?: number;
    flickerChance?: number;
    color?: string;
    width?: number;
    height?: number;
    className?: string;
    maxOpacity?: number;
    text?: string;
    fontSize?: number;
    fontWeight?: number | string;
}

export const FlickeringGridText: React.FC<FlickeringGridTextProps> = ({
    squareSize = 3,
    gridGap = 3,
    flickerChance = 0.2,
    color = "#B4B4B4",
    width,
    height,
    className,
    maxOpacity = 0.15,
    text = "",
    fontSize = 140,
    fontWeight = 600,
    ...props
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const colorPrefix = useMemo(() => getRGBAPrefix(color), [color]);

    const drawGrid = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            width: number,
            height: number,
            cols: number,
            rows: number,
            squares: Float32Array,
            dpr: number,
        ) => {
            ctx.clearRect(0, 0, width, height);

            const maskCanvas = document.createElement("canvas");
            maskCanvas.width = width;
            maskCanvas.height = height;
            const maskCtx = maskCanvas.getContext("2d", {
                willReadFrequently: true,
            });
            if (!maskCtx) return;

            if (text) {
                maskCtx.save();
                maskCtx.scale(dpr, dpr);
                maskCtx.fillStyle = "white";
                maskCtx.font = `${fontWeight} ${fontSize}px "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                maskCtx.textAlign = "center";
                maskCtx.textBaseline = "middle";
                maskCtx.fillText(text, width / (2 * dpr), height / (2 * dpr));
                maskCtx.restore();
            }

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x = i * (squareSize + gridGap) * dpr;
                    const y = j * (squareSize + gridGap) * dpr;
                    const squareWidth = squareSize * dpr;
                    const squareHeight = squareSize * dpr;

                    const maskData = maskCtx.getImageData(
                        x,
                        y,
                        squareWidth,
                        squareHeight,
                    ).data;
                    const hasText = maskData.some(
                        (value, index) => index % 4 === 0 && value > 0,
                    );

                    const opacity = squares[i * rows + j];
                    const finalOpacity = hasText
                        ? Math.min(1, opacity * 3 + 0.4)
                        : opacity;

                    ctx.fillStyle = `${colorPrefix} ${finalOpacity})`;
                    ctx.fillRect(x, y, squareWidth, squareHeight);
                }
            }
        },
        [colorPrefix, squareSize, gridGap, text, fontSize, fontWeight],
    );

    const setupCanvas = useCallback(
        (canvas: HTMLCanvasElement, width: number, height: number) => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            const cols = Math.ceil(width / (squareSize + gridGap));
            const rows = Math.ceil(height / (squareSize + gridGap));

            const squares = new Float32Array(cols * rows);
            for (let i = 0; i < squares.length; i++) {
                squares[i] = Math.random() * maxOpacity;
            }

            return { cols, rows, squares, dpr };
        },
        [squareSize, gridGap, maxOpacity],
    );

    const updateSquares = useCallback(
        (squares: Float32Array, deltaTime: number) => {
            for (let i = 0; i < squares.length; i++) {
                if (Math.random() < flickerChance * deltaTime) {
                    squares[i] = Math.random() * maxOpacity;
                }
            }
        },
        [flickerChance, maxOpacity],
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let gridParams: ReturnType<typeof setupCanvas>;

        const updateCanvasSize = () => {
            const newWidth = width || container.clientWidth;
            const newHeight = height || container.clientHeight;
            setCanvasSize({ width: newWidth, height: newHeight });
            gridParams = setupCanvas(canvas, newWidth, newHeight);
        };

        updateCanvasSize();

        let lastTime = 0;
        const animate = (time: number) => {
            if (!isInView) return;

            const deltaTime = (time - lastTime) / 1000;
            lastTime = time;

            updateSquares(gridParams.squares, deltaTime);
            drawGrid(
                ctx,
                canvas.width,
                canvas.height,
                gridParams.cols,
                gridParams.rows,
                gridParams.squares,
                gridParams.dpr,
            );
            animationFrameId = requestAnimationFrame(animate);
        };

        const resizeObserver = new ResizeObserver(() => {
            updateCanvasSize();
        });
        resizeObserver.observe(container);

        const intersectionObserver = new IntersectionObserver(
            ([entry]) => setIsInView(entry.isIntersecting),
            { threshold: 0 },
        );
        intersectionObserver.observe(canvas);

        if (isInView) {
            animationFrameId = requestAnimationFrame(animate);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
        };
    }, [setupCanvas, updateSquares, drawGrid, width, height, isInView]);

    return (
        <div
            ref={containerRef}
            className={cn(`h-full w-full ${className}`)}
            {...props}
        >
            <canvas
                ref={canvasRef}
                className="pointer-events-none"
                style={{ width: canvasSize.width, height: canvasSize.height }}
            />
        </div>
    );
};
