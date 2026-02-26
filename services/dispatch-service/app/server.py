from concurrent import futures
import math

import grpc

from . import dispatch_pb2, dispatch_pb2_grpc


def haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


class DispatchSvc(dispatch_pb2_grpc.DispatchServiceServicer):
    def GetInterceptRoute(self, request, context):
        dist = haversine_m(
            request.incident_lat,
            request.incident_lon,
            request.officer_lat,
            request.officer_lon,
        )
        eta = int(dist / 12.0)

        polyline = (
            f"MOCK({request.officer_lat},{request.officer_lon})"
            f"->({request.incident_lat},{request.incident_lon})"
        )
        return dispatch_pb2.InterceptResponse(
            incident_id=request.incident_id,
            officer_id=request.officer_id,
            distance_meters=float(dist),
            eta_seconds=eta,
            route_polyline=polyline,
        )


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    dispatch_pb2_grpc.add_DispatchServiceServicer_to_server(DispatchSvc(), server)
    server.add_insecure_port("[::]:50051")
    server.start()
    print("[dispatch-service] gRPC listening on :50051")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
