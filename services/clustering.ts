
export interface Point {
  id: string;
  features: number[]; // [latency, retries, is_failed]
  label: number; // -1 for noise, >=0 for cluster ID
}

export class DBSCAN {
  constructor(private eps: number, private minSamples: number) {}

  private getDistance(p1: number[], p2: number[]): number {
    return Math.sqrt(p1.reduce((sum, val, i) => sum + Math.pow(val - p2[i], 2), 0));
  }

  private getNeighbors(points: Point[], point: Point): Point[] {
    return points.filter(p => this.getDistance(point.features, p.features) <= this.eps);
  }

  run(data: {id: string, features: number[]}[]): Point[] {
    const points: Point[] = data.map(d => ({ ...d, label: -2 })); // -2 means unvisited
    let clusterId = 0;

    for (const p of points) {
      if (p.label !== -2) continue;

      const neighbors = this.getNeighbors(points, p);
      if (neighbors.length < this.minSamples) {
        p.label = -1; // Noise
      } else {
        p.label = clusterId;
        this.expandCluster(points, p, neighbors, clusterId);
        clusterId++;
      }
    }
    return points;
  }

  private expandCluster(points: Point[], point: Point, neighbors: Point[], clusterId: number) {
    let i = 0;
    while (i < neighbors.length) {
      const neighbor = neighbors[i];
      if (neighbor.label === -1) neighbor.label = clusterId;
      if (neighbor.label === -2) {
        neighbor.label = clusterId;
        const nextNeighbors = this.getNeighbors(points, neighbor);
        if (nextNeighbors.length >= this.minSamples) {
          neighbors.push(...nextNeighbors.filter(nn => !neighbors.find(n => n.id === nn.id)));
        }
      }
      i++;
    }
  }
}
