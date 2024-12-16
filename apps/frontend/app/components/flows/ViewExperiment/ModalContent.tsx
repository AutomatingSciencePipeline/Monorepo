interface ModalContentProps {
  isFullscreen?: boolean;
  children: React.ReactNode;
}

const ModalContent: React.FC<ModalContentProps> = ({ isFullscreen, children }) => {
  return (
    <div>
      {!isFullscreen && (children)}
    </div>
  );
};

export default ModalContent;