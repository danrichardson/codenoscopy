export async function onRequestGet() {
  const personas = [
    { id: 'security-expert', name: 'Security Expert' },
    { id: 'performance-optimizer', name: 'Performance Optimizer' },
    { id: 'clarity-advocate', name: 'Code Clarity Advocate' },
    { id: 'bug-hunter', name: 'Bug Hunter' },
    { id: 'best-practices', name: 'Best Practices Guru' },
    { id: 'mean', name: 'Mean' },
    { id: 'meaner', name: 'Meaner' },
    { id: 'meanest', name: 'Meanest' },
  ];

  return Response.json(personas);
}
