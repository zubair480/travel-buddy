"use client";

import type { EventFilters, FilterOption } from "@/lib/types";

interface FilterBarProps {
  filters: EventFilters;
  categoryOptions: FilterOption[];
  neighborhoodOptions: FilterOption[];
  onChange: (filters: EventFilters) => void;
}

export function FilterBar({ filters, categoryOptions, neighborhoodOptions, onChange }: FilterBarProps) {
  function updateDateRange(patch: Partial<Pick<EventFilters, "startDate" | "endDate">>) {
    onChange({ ...filters, date: "", ...patch });
  }

  function resetToThisWeek() {
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 6);
    const format = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    onChange({ ...filters, date: "", startDate: format(today), endDate: format(weekEnd) });
  }

  return (
    <section className="toolbar" aria-label="Event filters">
      <div className="field">
        <label htmlFor="search">Search</label>
        <input
          id="search"
          type="search"
          placeholder="AI, hiring, jazz, venue..."
          value={filters.q ?? ""}
          onChange={(event) => onChange({ ...filters, q: event.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="start-date">From</label>
        <input id="start-date" type="date" value={filters.startDate ?? filters.date ?? ""} onChange={(event) => updateDateRange({ startDate: event.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="end-date">To</label>
        <input id="end-date" type="date" value={filters.endDate ?? filters.date ?? ""} onChange={(event) => updateDateRange({ endDate: event.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="category">Category</label>
        <select id="category" value={filters.category} onChange={(event) => onChange({ ...filters, category: event.target.value })}>
          {categoryOptions.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="price">Price</label>
        <select id="price" value={filters.price} onChange={(event) => onChange({ ...filters, price: event.target.value as EventFilters["price"] })}>
          <option value="any">Any price</option>
          <option value="free">Free</option>
          <option value="under25">Under $25</option>
          <option value="under75">Under $75</option>
          <option value="splurge">Splurge</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="neighborhood">Neighborhood</label>
        <select id="neighborhood" value={filters.neighborhood} onChange={(event) => onChange({ ...filters, neighborhood: event.target.value })}>
          {neighborhoodOptions.map((neighborhood) => (
            <option key={neighborhood.value} value={neighborhood.value}>
              {neighborhood.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="sort">Sort</label>
        <select id="sort" value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value as EventFilters["sort"] })}>
          <option value="recommended">Best match</option>
          <option value="soonest">Soonest</option>
          <option value="price-low">Lowest price</option>
        </select>
      </div>
      <div className="field field-action">
        <label aria-hidden="true">&nbsp;</label>
        <button className="button secondary" type="button" onClick={resetToThisWeek}>
          This week
        </button>
      </div>
    </section>
  );
}
