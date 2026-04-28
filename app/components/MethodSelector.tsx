"use client";

import { useState } from "react";

interface Method {
  id: number;
  name: string;
  description: string;
}

const methods: Method[] = [
  {
    id: 1,
    name: "Karachi",
    description: "Université des Sciences Islamiques, Karachi",
  },
  { id: 2, name: "ISNA", description: "Société Islamique d'Amérique du Nord" },
  {
    id: 3,
    name: "MWL",
    description: "Ligue Islamique Mondiale (Recommandé Tunisie)",
  },
  { id: 4, name: "Makkah", description: "Umm Al-Qura, La Mecque" },
  { id: 5, name: "Egypt", description: "Autorité générale égyptienne" },
  { id: 7, name: "Kuwait", description: "Ministère des Awqaf du Koweït" },
  { id: 8, name: "Qatar", description: "Ministère des Awqaf du Qatar" },
  { id: 9, name: "Dubai", description: "Autorité générale de Dubaï" },
  { id: 10, name: "France", description: "Conseil Français du Culte Musulman" },
];

interface MethodSelectorProps {
  onMethodChange: (methodId: number) => void;
  currentMethod: number;
}

export default function MethodSelector({
  onMethodChange,
  currentMethod,
}: MethodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedMethod = methods.find((m) => m.id === currentMethod);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/10 hover:bg-white/20 rounded-lg p-3 text-left transition-colors"
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-green-300">Méthode de calcul</div>
            <div className="font-semibold">{selectedMethod?.name}</div>
            <div className="text-xs text-green-200">
              {selectedMethod?.description}
            </div>
          </div>
          <span className="text-2xl">{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-full bg-green-800 rounded-lg shadow-xl border border-green-600 max-h-96 overflow-y-auto">
          {methods.map((method) => (
            <button
              key={method.id}
              onClick={() => {
                onMethodChange(method.id);
                setIsOpen(false);
              }}
              className={`w-full text-left p-3 hover:bg-green-700 transition-colors ${
                currentMethod === method.id ? "bg-green-700" : ""
              }`}
            >
              <div className="font-semibold">{method.name}</div>
              <div className="text-xs text-green-300">{method.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
