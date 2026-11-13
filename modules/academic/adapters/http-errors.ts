export const academicErrorStatus = (error: unknown) => {
  const status = typeof error === "object" && error && "status" in error ? error.status : null;
  return status === 400 || status === 404 || status === 409 ? status : 500;
};
