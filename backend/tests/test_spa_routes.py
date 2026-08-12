def test_every_frontend_route_serves_the_production_app(client, invite, plan):
    guest, host = invite

    proposal = client.post(f"/api/invitations/guest/{guest}/proposals", json=plan)
    assert proposal.status_code == 201
    confirmation = client.post(f"/api/invitations/host/{host}/accept")
    assert confirmation.status_code == 200
    assert confirmation.json()["confirmed"] is True

    routes = [
        "/",
        f"/invite/{guest}",
        f"/invite/{guest}/build",
        f"/invite/{guest}/review",
        f"/invite/{guest}/confirmed",
        f"/invite/{guest}/today",
        f"/invite/{guest}/history",
        f"/respond/{host}",
        f"/respond/{host}/review",
        f"/respond/{host}/confirmed",
        f"/respond/{host}/today",
        f"/respond/{host}/history",
    ]
    for route in routes:
        response = client.get(route)
        assert response.status_code == 200, route
        assert "LET'S MEET" in response.text, route
