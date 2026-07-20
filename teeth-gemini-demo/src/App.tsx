import { RouterProvider } from 'react-router-dom';

import { appRouter } from './routes';
import { DemoSessionProvider } from './session/DemoSessionContext';

export function App() {
  return (
    <DemoSessionProvider>
      <RouterProvider router={appRouter} />
    </DemoSessionProvider>
  );
}
