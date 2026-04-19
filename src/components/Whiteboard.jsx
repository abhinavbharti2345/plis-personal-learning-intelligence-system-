import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

const Whiteboard = () => {
  return (
    <div className="h-full w-full flex">
      <Excalidraw />
    </div>
  );
};

export default Whiteboard;
