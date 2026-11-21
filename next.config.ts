import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La pagina dei prezzi è stata rimossa: per un'offerta dedicata si scrive o si chiama il team.
  async redirects() {
    return [{ source: "/pricing", destination: "/#contatti", permanent: true }];
  },
};

export default nextConfig;
