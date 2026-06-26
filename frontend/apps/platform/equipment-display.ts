import type { EquipmentStatus, EquipmentType } from "@erp/api";
import type { Status } from "@erp/ui/status-pill";

export const EQUIPMENT_TYPE_LABEL: Record<EquipmentType, string> = {
  SPLIT: "Split",
  CHILLER: "Chiller",
  CONDENSER: "Condensadora",
  EVAPORATOR: "Evaporadora",
  AIR_HANDLER: "Fan Coil / AHU",
  SOLAR_INVERTER: "Inversor Solar",
  ELECTRICAL_PANEL: "Quadro Elétrico",
  GENERATOR: "Gerador",
  OTHER: "Outro",
};

export const EQUIPMENT_STATUS_LABEL: Record<EquipmentStatus, string> = {
  ACTIVE: "Ativo",
  MAINTENANCE: "Em manutenção",
  INACTIVE: "Inativo",
  RETIRED: "Baixado",
};

export const EQUIPMENT_STATUS_PILL: Record<EquipmentStatus, Status> = {
  ACTIVE: "success",
  MAINTENANCE: "warning",
  INACTIVE: "offline",
  RETIRED: "danger",
};

export const EQUIPMENT_TYPES: EquipmentType[] = [
  "SPLIT",
  "CHILLER",
  "CONDENSER",
  "EVAPORATOR",
  "AIR_HANDLER",
  "SOLAR_INVERTER",
  "ELECTRICAL_PANEL",
  "GENERATOR",
  "OTHER",
];

export const EQUIPMENT_STATUSES: EquipmentStatus[] = ["ACTIVE", "MAINTENANCE", "INACTIVE", "RETIRED"];
