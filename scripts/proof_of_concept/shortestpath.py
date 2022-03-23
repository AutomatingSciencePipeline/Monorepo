#!/usr/bin/env python
import sys 

class Graph():
    
    def __init__(self, vertices):
        self.V = vertices
        self.graph = [[0 for column in range(vertices)]
                    for row in range(vertices)]

    # A utility function to find the vertex with
    # minimum distance value, from the set of vertices
    # not yet included in shortest path tree
    def minDistance(self, dist, sptSet):

        # Initialize minimum distance for next node
        min = 1e7

        # Search not nearest vertex not in the
        # shortest path tree
        for v in range(self.V):
            if dist[v] < min and sptSet[v] == False:
                min = dist[v]
                min_index = v

        return min_index

    # Function that implements Dijkstra's single source
    # shortest path algorithm for a graph represented
    # using adjacency matrix representation
    def dijkstra(self, src, dest, retpath):
        
        path = [0] * self.V
        dist = [1e7] * self.V
        dist[src] = 0
        sptSet = [False] * self.V

        for cout in range(self.V):

            # Pick the minimum distance vertex from
            # the set of vertices not yet processed.
            # u is always equal to src in first iteration
            u = self.minDistance(dist, sptSet)

            # Put the minimum distance vertex in the
            # shortest path tree
            sptSet[u] = True

            # Update dist value of the adjacent vertices
            # of the picked vertex only if the current
            # distance is greater than new distance and
            # the vertex in not in the shortest path tree
            for v in range(self.V):
                if (self.graph[u][v] > 0 and
                sptSet[v] == False and
                dist[v] > dist[u] + self.graph[u][v]):
                    dist[v] = dist[u] + self.graph[u][v]
                    path[v] = path[u] * 10 + v + 1
        if retpath:
            return path[dest]
        return dist[dest]

def main():

    
    # Driver program
    x = Graph(5)

    #ARGUMENT FORMAT: 
    # source node, destination node, a weight, b weight,  
    # c weight, d weight, e weight, f weight, g weight,
    # return path or distance (true for path, false for distance)
    args = sys.argv[1:]
    src = int(float(args[0])) - 1
    dest = int(float(args[1])) - 1
    a = float(args[2])
    b = float(args[3])
    c = float(args[4])
    d = float(args[5])
    e = float(args[6])
    f = float(args[7])
    g = float(args[8])
    retpath = float(args[9])

    x.graph = [[0, a, b, c, 0],
            [a, 0, 0, d, e],
            [b, 0, 0, f, 0],
            [c, d, f, 0, g],
            [0, e, 0, g, 0]
            ]
    
    print(x.dijkstra(src, dest, retpath))
    return 0


if __name__ == "__main__":
    main()
