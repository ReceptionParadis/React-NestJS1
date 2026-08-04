import { useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

type RoomingRow = {
  firstName: string;
  lastName: string;
  gender?: string;
  birthDate?: string;
  roomType: 'SINGLE' | 'DOUBLE' | 'TWIN' | 'TRIPLE' | 'QUADRUPLE';
  requestedRoom?: string;
  specialNeeds?: string;
  sourceRow: number;
};

type Props = {
  groupId: string | number;
  onImported?: (rows: RoomingRow[]) => void;
};

const roomTypeMap: Record<string, RoomingRow['roomType']> = {
  single: 'SINGLE', individuelle: 'SINGLE', double: 'DOUBLE', twin: 'TWIN', triple: 'TRIPLE', quadruple: 'QUADRUPLE',
};

function value(row: Record<string, unknown>, aliases: string[]) {
  const key = Object.keys(row).find((item) => aliases.includes(item.trim().toLowerCase()));
  return key ? String(row[key] ?? '').trim() : '';
}

export function RoomingListImport({ groupId, onImported }: Props) {
  const [rows, setRows] = useState<RoomingRow[]>([]);
  const [error, setError] = useState('');
  const [isSending, setSending] = useState(false);

  async function readFile(file: File) {
    setError('');
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const parsed = raw.map((row, index) => {
        const type = value(row, ['type', 'type chambre', 'room type', 'bedding']).toLowerCase();
        return {
          firstName: value(row, ['prénom', 'prenom', 'first name', 'firstname']),
          lastName: value(row, ['nom', 'last name', 'lastname', 'surname']),
          gender: value(row, ['sexe', 'gender']) || undefined,
          birthDate: value(row, ['date naissance', 'date de naissance', 'birth date']) || undefined,
          roomType: roomTypeMap[type] ?? 'TWIN',
          requestedRoom: value(row, ['chambre', 'room', 'room number']) || undefined,
          specialNeeds: value(row, ['observations', 'notes', 'special needs']) || undefined,
          sourceRow: index + 2,
        } satisfies RoomingRow;
      }).filter((row) => row.firstName || row.lastName);
      if (!parsed.length) throw new Error('Aucune ligne exploitable détectée.');
      setRows(parsed);
    } catch (exception) {
      setRows([]);
      setError(exception instanceof Error ? exception.message : 'Import impossible.');
    }
  }

  async function importRows() {
    setSending(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:3001/api/groups/${groupId}/rooming-list/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      if (!response.ok) throw new Error('L’API a refusé la rooming list.');
      onImported?.(rows);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  return <section className="rooming-import">
    <div className="rooming-import-heading"><FileSpreadsheet size={20}/><div><strong>Importer la rooming list</strong><span>Formats acceptés : .xlsx, .xls et .csv</span></div></div>
    <label className="rooming-dropzone"><Upload size={20}/><span>Sélectionner un fichier Excel</span><input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => event.target.files?.[0] && readFile(event.target.files[0])}/></label>
    {error && <p className="rooming-error">{error}</p>}
    {rows.length > 0 && <div className="rooming-preview"><p><strong>{rows.length}</strong> voyageurs détectés</p><div>{rows.slice(0, 5).map((row) => <span key={`${row.sourceRow}-${row.lastName}`}>{row.lastName} {row.firstName} · {row.roomType}</span>)}</div><button className="primary-button" type="button" disabled={isSending} onClick={importRows}>{isSending ? 'Import…' : 'Valider l’import'}</button></div>}
  </section>;
}
