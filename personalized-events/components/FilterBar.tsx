"use client";

import type { EventFilters, FilterOption } from "@/lib/types";

interface FilterBarProps {
  filters: EventFilters;
  categoryOptions: FilterOption[];
  neighborhoodOptions: FilterOption[];
  onChange: (filters: EventFilters) => void;
}

export function FilterBar({ filters, categoryOptions, neighborhoodOptions, onChange }: FilterBarProps) {
  return (
    <section className="toolbar" aria-label="Event filters">
      <div className="field">
        <label htmlFor="date">Date</label>
        <input id="date" type="date" value={filters.date} onChange={(event) => onChange({ ...filters, date: event.target.value })} />
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
    </section>
  );
}
