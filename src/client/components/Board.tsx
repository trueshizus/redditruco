interface BoardProps {
  children?: React.ReactNode;
}

export const Board = ({ children }: BoardProps) => {
  return (
    <div className="flex-1 flex justify-center items-center bg-green-100 border-2 border-green-300 rounded-lg m-4">
      <div className="text-center text-gray-500">
        {children || "Game Board - Cards will be played here"}
      </div>
    </div>
  );
};
