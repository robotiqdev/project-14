export const db = {
  query: async (
    sql: string,
    params?: any[],
  ): Promise<{ rows: any[]; rowCount: number }> => {
    throw new Error('Not implemented');
  },
};
