import { cn } from "@/lib/utils";

interface Match {
  id: string;
  matchNumber: number;
  type: "Qualification" | "Playoff" | "Final";
  redAlliance: number[];
  blueAlliance: number[];
  redScore: number;
  blueScore: number;
  status: "completed" | "upcoming" | "live";
  time: string;
}

const mockMatches: Match[] = [
  {
    id: "1",
    matchNumber: 42,
    type: "Qualification",
    redAlliance: [254, 1678, 971],
    blueAlliance: [118, 2056, 987],
    redScore: 156,
    blueScore: 142,
    status: "completed",
    time: "10:30 AM",
  },
  {
    id: "2",
    matchNumber: 43,
    type: "Qualification",
    redAlliance: [3310, 4414, 5940],
    blueAlliance: [2910, 1323, 6328],
    redScore: 0,
    blueScore: 0,
    status: "live",
    time: "10:45 AM",
  },
  {
    id: "3",
    matchNumber: 44,
    type: "Qualification",
    redAlliance: [2767, 3847, 1241],
    blueAlliance: [4499, 5406, 2659],
    redScore: 0,
    blueScore: 0,
    status: "upcoming",
    time: "11:00 AM",
  },
  {
    id: "4",
    matchNumber: 45,
    type: "Qualification",
    redAlliance: [1114, 2481, 3478],
    blueAlliance: [5172, 6672, 7028],
    redScore: 0,
    blueScore: 0,
    status: "upcoming",
    time: "11:15 AM",
  },
];

const MatchesTable = () => {
  return (
    <div className="stat-card !p-0 overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-border">
        <h3 className="font-mono font-bold text-foreground">Recent Matches</h3>
        <p className="text-sm text-muted-foreground mt-1">Live match schedule and results</p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Match</th>
              <th>Type</th>
              <th>Red Alliance</th>
              <th>Blue Alliance</th>
              <th>Score</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {mockMatches.map((match) => (
              <tr key={match.id} className="group">
                <td>
                  <span className="font-mono font-semibold text-foreground">
                    #{match.matchNumber}
                  </span>
                </td>
                <td>
                  <span className="text-muted-foreground">{match.type}</span>
                </td>
                <td>
                  <div className="flex gap-1">
                    {match.redAlliance.map((team) => (
                      <span
                        key={team}
                        className="px-2 py-0.5 bg-destructive/20 text-destructive text-xs font-mono rounded"
                      >
                        {team}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="flex gap-1">
                    {match.blueAlliance.map((team) => (
                      <span
                        key={team}
                        className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-mono rounded"
                      >
                        {team}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  {match.status === "completed" ? (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-mono font-semibold",
                        match.redScore > match.blueScore ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {match.redScore}
                      </span>
                      <span className="text-muted-foreground">-</span>
                      <span className={cn(
                        "font-mono font-semibold",
                        match.blueScore > match.redScore ? "text-primary" : "text-muted-foreground"
                      )}>
                        {match.blueScore}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td>
                  <span
                    className={cn(
                      "status-badge",
                      match.status === "completed" && "status-online",
                      match.status === "live" && "status-pending",
                      match.status === "upcoming" && "bg-secondary text-muted-foreground"
                    )}
                  >
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      match.status === "completed" && "bg-success",
                      match.status === "live" && "bg-warning animate-pulse",
                      match.status === "upcoming" && "bg-muted-foreground"
                    )} />
                    {match.status === "completed" ? "Completed" : match.status === "live" ? "Live" : "Upcoming"}
                  </span>
                </td>
                <td>
                  <span className="text-muted-foreground font-mono text-xs">{match.time}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MatchesTable;
