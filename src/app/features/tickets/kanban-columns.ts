export type TicketColumnOption = {
  label: string;
  value: string;
};

export const TICKET_KANBAN_COLUMNS: TicketColumnOption[] = [
  { label: 'Backlog', value: 'backlog' },
  { label: 'Em Progresso', value: 'em-progresso' },
  { label: 'Atualizar Homol', value: 'atualizar-homol' },
  { label: 'Validar Homl', value: 'validar-homl' },
  { label: 'Atualizar Prod', value: 'atualizar-prod' },
  { label: 'Finalizado', value: 'finalizado' },
];
