import { configureStore } from "@reduxjs/toolkit";
import spacetimeReducer from "./spacetime-slice";

export const store = configureStore({
  reducer: {
    spacetime: spacetimeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["spacetime/setTableData"],
        ignoredPaths: ["spacetime"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
