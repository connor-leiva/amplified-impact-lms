// The offer's catalog lives in `@ai/core/offer`, so the www pages' build and the API read one copy
// (D-073). Re-exported here so the billing code keeps one short import path.
export * from '@ai/core/offer';
