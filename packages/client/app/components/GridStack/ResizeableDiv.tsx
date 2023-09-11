'use client';

import DragHandleIcon from '@mui/icons-material/DragHandle';
import { MouseEventHandler, PropsWithChildren } from 'react';

const minimumHeight = 100;
const maximumHeight = 800;
let originalHeight = 0;
let originalY = 0;
let originalMouseY = 0;

let element: HTMLElement;

const resize = (event: MouseEvent) => {
  const height = originalHeight - (event.pageY - originalMouseY);
  if (height > minimumHeight && height < maximumHeight) {
    element.style.height = height + 'px';
    element.style.top = originalY + (event.pageY - originalMouseY) + 'px';
  }
};

function ResizeableDiv({ children }: PropsWithChildren<{}>) {
  const startResize: MouseEventHandler<HTMLDivElement> = (event) => {
    element = document.getElementById('apollon-drag-queen')!;

    originalHeight = parseFloat(getComputedStyle(element, null).getPropertyValue('height').replace('px', ''));
    originalY = element.getBoundingClientRect().top;
    originalMouseY = event.pageY;

    window.addEventListener('mousemove', resize);
  };

  return (
    <>
      <div
        onMouseUp={() => {
          window.removeEventListener('mousemove', resize);
        }}
        style={{ display: 'flex', justifyContent: 'center' }}
      >
        <div onMouseDown={startResize}>
          <DragHandleIcon fontSize="small" sx={{ color: '#46434F', cursor: 'n-resize' }} />
        </div>
      </div>

      <div id="apollon-drag-queen" style={{ height: 270 }}>
        {children}
      </div>
    </>
  );
}

export default ResizeableDiv;
