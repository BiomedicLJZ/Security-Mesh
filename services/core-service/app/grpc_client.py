import os

import grpc

from . import dispatch_pb2, dispatch_pb2_grpc  # type: ignore


def get_dispatch_stub():
    target = os.getenv("DISPATCH_GRPC_TARGET", "dispatch-service:50051")
    channel = grpc.insecure_channel(target)
    return dispatch_pb2_grpc.DispatchServiceStub(channel)


def request_route(
    stub,
    incident_id: str,
    incident_lat: float,
    incident_lon: float,
    officer_id: str,
    officer_lat: float,
    officer_lon: float,
):
    req = dispatch_pb2.InterceptRequest(
        incident_id=incident_id,
        incident_lat=incident_lat,
        incident_lon=incident_lon,
        officer_id=officer_id,
        officer_lat=officer_lat,
        officer_lon=officer_lon,
    )
    return stub.GetInterceptRoute(req, timeout=2.0)
