import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardPlus,
  DoorOpen,
  Filter,
  Hotel,
  MapPin,
  Search,
  Sparkles,
  UsersRound,
  Wrench,
  X,
} from 'lucide-react';

type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'INSPECTED' | 'OUT_OF_ORDER';
type Room = {
  id: string;
  number: string;
  building: 'A' | 'B';
  floor: number;
  type: 'Double' | 'Twin' | 'Triple' | 'Quadruple';
  view: 'Gave' | 'Pyrénées' | 'Cour intérieure';
  capacity: number;
  status: RoomStatus;
  guest?: string;
  group?: string;
  arrival?: string;
  departure?: string;
  housekeeper?: string;
  ticket?: string;
};

const statusLabels: Record<RoomStatus, string> = {
  AVAILABLE: 'Libre',
  OCCUPIED: 'Occupée',
  CLEANING: 'En nettoyage',
  INSPECTED: 'Contrôlée',
  OUT_OF_ORDER: 'Hors service',
};

const statusOrder: RoomStatus[] = ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'INSPECTED', 'OUT_OF_ORDER'];

function makeRooms(): Room[] {
  const rooms: Room[] = [];
  const aSuffixes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '14', '15'];
  const bSuffixes = ['51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76'];
  const statuses: RoomStatus[] = ['AVAILABLE', 'OCCUPIED', 'INSPECTED', 'CLEANING', 'AVAILABLE', 'OCCUPIED'];

  for (let floor = 2; floor <= 8; floor += 1) {
    aSuffixes.forEach((suffix, index) => {
      const number = `${floor}${suffix}`;
      rooms.push({
        id: `A-${number}`,
        number,
        building: 'A',
        floor,
        type: suffix === '10' || suffix === '12' ? 'Quadruple' : suffix === '01' || suffix === '15' ? 'Triple' : suffix === '08' || suffix === '09' ? 'Twin' : 'Double',
        view: index < 5 ? 'Gave' : index < 10 ? 'Pyrénées' : 'Cour intérieure',
        capacity: suffix === '10' || suffix === '12' ? 4 : suffix === '01' || suffix === '15' ? 3 : 2,
        status: number === '412' ? 'OUT_OF_ORDER' : statuses[(floor + index) % statuses.length],
        guest: (floor + index) % 5 === 0 ? 'Mme Martin' : undefined,
        group: (floor + index) % 4 === 0 ? 'Tangney' : undefined,
        arrival: '04/08/2026',
        departure: '08/08/2026',
        housekeeper: index % 2 === 0 ? 'Valérie' : 'Noémie',
        ticket: number === '412' ? 'Climatisation en panne' : undefined,
      });
    });

    bSuffixes.forEach((suffix, index) => {
      const number = `${floor}${suffix}`;
      rooms.push({
        id: `B-${number}`,
        number,
        building: 'B',
        floor,
        type: index % 7 === 0 ? 'Triple' : index % 5 === 0 ? 'Twin' : 'Double',
        view: index < 9 ? 'Gave' : index < 18 ? 'Pyrénées' : 'Cour intérieure',
        capacity: index % 7 === 0 ? 3 : 2,
        status: statuses[(floor + index + 2) % statuses.length],
        group: index % 3 === 0 ? 'ORP' : undefined,
        arrival: '04/08/2026',
        departure: '07/08/2026',
        housekeeper: index % 2 === 0 ? 'Vancesca' : 'Louane',
      });
    });
  }
  return rooms;
}

export function RoomsPage() {
  const [rooms, setRooms] = useState(makeRooms);
  const [building, setBuilding] = useState<'A' | 'B'>('A');
  const [floor, setFloor] = useState(4);
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const visibleRooms = useMemo(() => rooms.filter((room) => {
    const matchesLocation = room.building === building && room.floor === floor;
    const matchesStatus = statusFilter === 'ALL' || room.status === statusFilter;
    const matchesQuery = !query.trim() || `${room.number} ${room.type} ${room.group ?? ''} ${room.guest ?? ''}`.toLowerCase().includes(query.toLowerCase());
    return matchesLocation && matchesStatus && matchesQuery;
  }), [rooms, building, floor, statusFilter, query]);

  const counts = useMemo(() => statusOrder.reduce<Record<RoomStatus, number>>((result, status) => {
    result[status] = rooms.filter((room) => room.building === building && room.floor === floor && room.status === status).length;
    return result;
  }, { AVAILABLE: 0, OCCUPIED: 0, CLEANING: 0, INSPECTED: 0, OUT_OF_ORDER: 0 }), [rooms, building, floor]);

  function updateStatus(status: RoomStatus) {
    if (!selectedRoom) return;
    setRooms((current) => current.map((room) => room.id === selectedRoom.id ? { ...room, status } : room));
    setSelectedRoom((current) => current ? { ...current, status } : current);
  }

  return (
    <div className="rooms-page">
      <header className="rooms-header">
        <div>
          <button className="back-link" type="button" onClick={() => { window.history.pushState({}, '', '/'); window.location.reload(); }}><ArrowLeft size={17} /> Tableau de bord</button>
          <p className="eyebrow">Plan opérationnel</p>
          <h1>Hôtel Paradis</h1>
          <p className="rooms-subtitle">Suivi visuel des chambres, du nettoyage et des incidents.</p>
        </div>
        <div className="rooms-summary">
          <span><Hotel size={18} /> 302 chambres</span>
          <span><CheckCircle2 size={18} /> 287 prêtes</span>
          <span><Wrench size={18} /> 4 hors service</span>
        </div>
      </header>

      <section className="rooms-toolbar panel">
        <div className="building-tabs">
          {(['A', 'B'] as const).map((item) => (
            <button key={item} type="button" className={building === item ? 'active' : ''} onClick={() => setBuilding(item)}>
              <Building2 size={18} /> Bâtiment {item}
            </button>
          ))}
        </div>
        <div className="floor-tabs" aria-label="Choisir un étage">
          {[2, 3, 4, 5, 6, 7, 8].map((item) => <button key={item} type="button" className={floor === item ? 'active' : ''} onClick={() => setFloor(item)}>{item}e</button>)}
        </div>
        <label className="room-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Chambre, client, groupe…" /></label>
      </section>

      <section className="room-status-cards">
        {statusOrder.map((status) => (
          <button key={status} type="button" className={`room-status-card ${status.toLowerCase()}${statusFilter === status ? ' active' : ''}`} onClick={() => setStatusFilter(statusFilter === status ? 'ALL' : status)}>
            <strong>{counts[status]}</strong><span>{statusLabels[status]}</span>
          </button>
        ))}
      </section>

      <section className="floor-panel panel">
        <div className="floor-panel-head">
          <div><p className="eyebrow">Bâtiment {building}</p><h2>{floor}e étage</h2></div>
          <button className="filter-reset" type="button" onClick={() => { setStatusFilter('ALL'); setQuery(''); }}><Filter size={16} /> Réinitialiser</button>
        </div>

        <div className="hotel-floor-map">
          <div className="room-wing">
            {visibleRooms.slice(0, Math.ceil(visibleRooms.length / 2)).map((room) => <RoomButton key={room.id} room={room} onSelect={setSelectedRoom} />)}
          </div>
          <div className="hotel-corridor"><span>Couloir</span><div><DoorOpen size={20} /> Ascenseurs & escaliers</div></div>
          <div className="room-wing lower">
            {visibleRooms.slice(Math.ceil(visibleRooms.length / 2)).map((room) => <RoomButton key={room.id} room={room} onSelect={setSelectedRoom} />)}
          </div>
        </div>

        {visibleRooms.length === 0 && <div className="room-empty">Aucune chambre ne correspond aux filtres sélectionnés.</div>}
      </section>

      <section className="room-legend panel">
        {statusOrder.map((status) => <span key={status}><i className={`legend-dot ${status.toLowerCase()}`} />{statusLabels[status]}</span>)}
      </section>

      {selectedRoom && (
        <div className="room-drawer-backdrop" onMouseDown={() => setSelectedRoom(null)}>
          <aside className="room-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="room-drawer-head">
              <div><p className="eyebrow">Bâtiment {selectedRoom.building} · {selectedRoom.floor}e étage</p><h2>Chambre {selectedRoom.number}</h2></div>
              <button className="icon-button" type="button" onClick={() => setSelectedRoom(null)}><X size={19} /></button>
            </div>

            <span className={`room-detail-status ${selectedRoom.status.toLowerCase()}`}>{statusLabels[selectedRoom.status]}</span>
            <div className="room-detail-grid">
              <Detail icon={<BedDouble size={18} />} label="Type" value={`${selectedRoom.type} · ${selectedRoom.capacity} pers.`} />
              <Detail icon={<MapPin size={18} />} label="Vue" value={selectedRoom.view} />
              <Detail icon={<UsersRound size={18} />} label="Client / groupe" value={selectedRoom.guest ?? selectedRoom.group ?? 'Aucune attribution'} />
              <Detail icon={<Sparkles size={18} />} label="Housekeeping" value={selectedRoom.housekeeper ?? 'Non affectée'} />
            </div>

            <div className="stay-card"><strong>Séjour</strong><span>Arrivée : {selectedRoom.arrival ?? '—'}</span><span>Départ : {selectedRoom.departure ?? '—'}</span></div>
            {selectedRoom.ticket && <div className="ticket-warning"><Wrench size={18} /><div><strong>Ticket maintenance ouvert</strong><span>{selectedRoom.ticket}</span></div></div>}

            <div className="status-actions">
              <h3>Modifier le statut</h3>
              <div>{statusOrder.map((status) => <button key={status} type="button" className={selectedRoom.status === status ? 'active' : ''} onClick={() => updateStatus(status)}>{statusLabels[status]}</button>)}</div>
            </div>

            <div className="room-actions">
              <button className="primary-button" type="button"><ClipboardPlus size={17} /> Créer un ticket</button>
              <button className="secondary-button" type="button">Ajouter une note</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function RoomButton({ room, onSelect }: { room: Room; onSelect: (room: Room) => void }) {
  return <button type="button" className={`room-tile ${room.status.toLowerCase()}`} onClick={() => onSelect(room)}>
    <strong>{room.number}</strong><span>{room.type}</span>{room.group && <small>{room.group}</small>}<ChevronRight size={15} />
  </button>;
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="room-detail-item"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}
