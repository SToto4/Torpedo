import type { ShipDefinition } from '../types';

interface ShipSelectorProps {
  ships: ShipDefinition[];
  placedShipIds: Set<string>;
  selectedShipId: string | null;
  onSelect: (shipId: string) => void;
}

function ShipSelector({ ships, placedShipIds, selectedShipId, onSelect }: ShipSelectorProps) {
  return (
    <div className="ship-selector">
      <h3>🚢 Hajók</h3>
      {ships.map((ship) => {
        const isPlaced = placedShipIds.has(ship.id);
        const isSelected = selectedShipId === ship.id;

        return (
          <div
            key={ship.id}
            className={`ship-item ${isSelected ? 'ship-selected' : ''} ${isPlaced ? 'ship-placed' : ''}`}
            onClick={() => {
              if (!isPlaced) {
                onSelect(ship.id);
              }
            }}
          >
            <div className="ship-blocks">
              {Array.from({ length: ship.size }, (_, i) => (
                <div key={i} className="ship-block" />
              ))}
            </div>
            <span className="ship-label">
              {ship.label} {isPlaced ? '✓' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default ShipSelector;
