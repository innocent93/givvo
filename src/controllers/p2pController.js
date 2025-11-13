import * as svc from '../services/p2pService.js';
export async function listOffers(req, res) {
  res.json(await svc.listOffers(req.query));
}
export async function createOffer(req, res, next) {
  try {
    res.status(201).json(await svc.createOffer(req.user.id, req.body));
  } catch (e) {
    next(e);
  }
}
export async function pauseOffer(req, res, next) {
  try {
    res.json(await svc.pauseOffer(req.params.id, req.user.id));
  } catch (e) {
    next(e);
  }
}
export async function deleteOffer(req, res, next) {
  try {
    res.json(await svc.deleteOffer(req.params.id, req.user.id));
  } catch (e) {
    next(e);
  }
}
export async function initiateTrade(req, res, next) {
  try {
    res
      .status(201)
      .json(
        await svc.initiateTrade(req.params.id, req.user.id, req.body.amountFiat)
      );
  } catch (e) {
    next(e);
  }
}
export async function markPaid(req, res, next) {
  try {
    res.json(
      await svc.markPaid(
        req.params.id,
        req.user.id,
        req.body.proofUrl,
        req.body.note
      )
    );
  } catch (e) {
    next(e);
  }
}
export async function release(req, res, next) {
  try {
    res.json(await svc.release(req.params.id, req.user.id));
  } catch (e) {
    next(e);
  }
}
