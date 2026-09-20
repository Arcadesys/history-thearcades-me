import { describe, expect, it } from "vitest";
import { news, songs, years, yearWeather } from "./cultural-weather-vane";

describe("Cultural Weather Vane corpus", () => {
  it("preserves six songs and six events for every sampled year", () => {
    expect(years).toHaveLength(12);
    expect(yearWeather).toHaveLength(years.length);
    expect(songs).toHaveLength(72);
    expect(news).toHaveLength(72);
    for (const year of years) {
      expect(songs.filter((item) => item.year === year)).toHaveLength(6);
      expect(news.filter((item) => item.year === year)).toHaveLength(6);
    }
  });
});
