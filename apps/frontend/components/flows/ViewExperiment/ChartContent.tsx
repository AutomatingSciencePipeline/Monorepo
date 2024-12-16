import { useEffect } from "react";

interface ChartContentProps {
    isFullscreen?: boolean;
    children: React.ReactNode;
    toggleFullscreen: () => void;
  }
  
  const ChartContent: React.FC<ChartContentProps> = ({ isFullscreen, children, toggleFullscreen }) => {

    useEffect(() => {
        toggleFullscreen();
    }, [isFullscreen]);

    return (
      <div>
        {children}
      </div>
    );
  };
  
  export default ChartContent;