"use client";

import type { EventFilters, NeighborhoodOption } from "@/lib/types";

interface FilterBarProps {
  filters: EventFilters;
  onChange: (filters: EventFilters) => void;
  categories: string[];
  neighborhoods: NeighborhoodOption[];
}

export function FilterBar({ filters, onChange, categories, neighborhoods }: FilterBarProps) {
  return (
    <section className="toolbar" aria-label="Event filters">
      <div className="field grow">
        <label htmlFor="q">Search</label>
        <input id="q" placeholder="AI, design, jazz, founder..." value={filters.q} onChange={(event) => onChange({ ...filters, q: event.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="date">Date</label>
        <select id="date" value={filters.date} onChange={(event) => onChange({ ...filters, date: event.target.value as EventFilters["date"] })}>
          <option value="any">Any date</option>
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="weekend">This weekend</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="category">Category</label>
        <select id="category" value={filters.category} onChange={(event) => onChange({ ...filters, category: event.target.value as EventFilters["category"] })}>
          {["any", ...categories].map((category) => (
            <option key={category} value={category}>
              {category === "any" ? "Any category" : category}
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
        <select id="neighborhood" value={filters.neighborhood} onChange={(event) => onChange({ ...filters, neighborhood: event.target.value as EventFilters["neighborhood"] })}>
          <option value="any">Any neighborhood</option>
          {neighborhoods.map((neighborhood) => (
            <option key={neighborhood.slug} value={neighborhood.slug}>
              {neighborhood.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="sort">Sort</label>
        <select id="sort" value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value as EventFilters["sort"] })}>
          <option value="recommended">Best match</option>
          <option value="soonest">Soonest</option>
          <option value="popular">Popular</option>
          <option value="price-low">Lowest price</option>
        </select>
      </div>
    </section>
  );
}
