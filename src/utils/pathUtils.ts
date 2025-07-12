export const getRelativePath = (
  filePath?: string,
  serverCwd?: string
): string => {
  if (!filePath) return 'file'
  
  // If no server cwd, just return filename
  if (!serverCwd) {
    return filePath.split('/').pop() || filePath
  }
  
  // Convert absolute to relative if possible
  if (filePath.startsWith(serverCwd)) {
    const relativePath = filePath.slice(serverCwd.length + 1)
    return relativePath || filePath
  }
  
  // Fallback to filename
  return filePath.split('/').pop() || filePath
}

export const extractFilePath = (args?: Record<string, unknown>): string | undefined => {
  return args?.filePath as string | undefined
}