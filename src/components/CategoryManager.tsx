/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDocenteStore } from "../store/docenteStore";
import { Plus, Trash2, Edit2, Check, X, AlertTriangle } from "lucide-react";

interface CategoryManagerProps {
  groupId: string;
}

export default function CategoryManager({ groupId }: CategoryManagerProps) {
  const categories = useDocenteStore((state) =>
    state.categories.filter((c) => c.groupId === groupId)
  );
  const createCategory = useDocenteStore((state) => state.createCategory);
  const updateCategory = useDocenteStore((state) => state.updateCategory);
  const deleteCategory = useDocenteStore((state) => state.deleteCategory);

  const [newCatName, setNewCatName] = useState("");
  const [newCatPercentage, setNewCatPercentage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPercentage, setEditPercentage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = newCatName.trim();
    const percent = parseInt(newCatPercentage, 10);

    if (!name) {
      setError("El nombre de la categoría es obligatorio.");
      return;
    }
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      setError("El porcentaje debe ser un número entero entre 1 y 100.");
      return;
    }

    if (totalPercentage + percent > 100) {
      setError(`No se puede agregar. El total excedería el 100% (Suma actual: ${totalPercentage}% + ${percent}% = ${totalPercentage + percent}%).`);
      return;
    }

    try {
      await createCategory(groupId, name, percent);
      setNewCatName("");
      setNewCatPercentage("");
    } catch (err) {
      console.error(err);
      setError("Error al guardar la categoría.");
    }
  };

  const startEdit = (id: string, currentName: string, currentPercent: number) => {
    setEditingId(id);
    setEditName(currentName);
    setEditPercentage(currentPercent.toString());
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPercentage("");
    setError(null);
  };

  const handleSaveEdit = async (id: string) => {
    setError(null);
    const name = editName.trim();
    const percent = parseInt(editPercentage, 10);

    if (!name) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      setError("El porcentaje debe estar entre 1 y 100.");
      return;
    }

    const currentCat = categories.find((c) => c.id === id);
    const otherCatsTotal = totalPercentage - (currentCat ? currentCat.percentage : 0);

    if (otherCatsTotal + percent > 100) {
      setError(`No se puede actualizar. El total excedería el 100% (Suma de las otras categorías: ${otherCatsTotal}% + ${percent}% = ${otherCatsTotal + percent}%).`);
      return;
    }

    try {
      await updateCategory(id, name, percent);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setError("Error al actualizar la categoría.");
    }
  };

  return (
    <div id="category-manager-root" className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Categorías de Evaluación</h3>
        <p className="text-sm text-slate-500">
          Establece los criterios de evaluación y sus porcentajes de ponderación. La suma total debe ser exactamente 100%.
        </p>
      </div>

      {error && (
        <div id="category-error" className="flex items-center gap-2.5 bg-red-50 text-red-700 border border-red-100 rounded-lg p-3 text-xs mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress Bar of evaluation */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
          <span className="text-slate-600">Ponderación Total Acumulada</span>
          <span className={`px-2 py-0.5 rounded ${totalPercentage === 100 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {totalPercentage}% de 100%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
          {categories.map((cat, idx) => {
            const colors = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-violet-500"];
            const colorClass = colors[idx % colors.length];
            return (
              <div
                key={cat.id}
                style={{ width: `${cat.percentage}%` }}
                className={`${colorClass} h-full transition-all duration-300`}
                title={`${cat.name}: ${cat.percentage}%`}
              />
            );
          })}
        </div>
        {totalPercentage !== 100 && (
          <div className="flex items-center gap-1.5 text-amber-600 text-xs mt-2 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>La suma total actual es de {totalPercentage}%. Configure categorías hasta alcanzar el 100% para habilitar promedios finales correctos.</span>
          </div>
        )}
      </div>

      {/* Categories List */}
      <div className="space-y-3 mb-6">
        {categories.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-100 rounded-lg">
            No hay categorías de evaluación creadas aún. Agrega una abajo para comenzar.
          </div>
        ) : (
          categories.map((cat, idx) => {
            const isEditing = editingId === cat.id;
            return (
              <div
                key={cat.id}
                className="flex items-center justify-between border border-slate-100 rounded-lg p-3 hover:bg-slate-50/50 transition bg-white shadow-sm"
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      id={`edit-cat-name-${cat.id}`}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 text-xs border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      placeholder="Nombre de categoría"
                    />
                    <div className="flex items-center gap-1 w-24">
                      <input
                        id={`edit-cat-percent-${cat.id}`}
                        type="number"
                        min="1"
                        max="100"
                        value={editPercentage}
                        onChange={(e) => setEditPercentage(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        placeholder="%"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        id={`btn-save-cat-${cat.id}`}
                        onClick={() => handleSaveEdit(cat.id)}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-cancel-cat-${cat.id}`}
                        onClick={cancelEdit}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="font-semibold text-xs text-slate-700">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-xs text-slate-800 bg-slate-50 px-2.5 py-1 rounded">
                        {cat.percentage}%
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          id={`btn-edit-cat-${cat.id}`}
                          onClick={() => startEdit(cat.id, cat.name, cat.percentage)}
                          className="p-1 text-slate-400 hover:text-slate-700 transition hover:bg-slate-50 rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-cat-${cat.id}`}
                          onClick={() => {
                            if (confirm(`¿Está seguro que desea eliminar la categoría "${cat.name}"? Se borrarán todas sus calificaciones asociadas.`)) {
                              deleteCategory(cat.id);
                            }
                          }}
                          className="p-1 text-rose-400 hover:text-rose-700 transition hover:bg-rose-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add New Category Form */}
      {totalPercentage < 100 && (
        <form onSubmit={handleAdd} className="border-t border-slate-100 pt-5 mt-4">
          <h4 className="text-xs font-semibold text-slate-700 mb-3">Nueva Categoría</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="input-new-cat-name"
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Ej: Exámenes, Tareas, Proyecto..."
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <div className="flex items-center gap-2 sm:w-32">
              <input
                id="input-new-cat-percent"
                type="number"
                min="1"
                max="100"
                value={newCatPercentage}
                onChange={(e) => setNewCatPercentage(e.target.value)}
                placeholder="Porcentaje"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-center bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <span className="text-slate-400 text-xs font-medium">%</span>
            </div>
            <button
              id="btn-add-category"
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
