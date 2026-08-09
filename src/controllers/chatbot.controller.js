const chatbotService = require("../services/chatbot.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");


// Nhận câu hỏi người dùng và trả lời qua chatbot
const ask = async (req, res, next) => {
  try {
    const data = await chatbotService.ask(req.chatbotRequest);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CHATBOT_ANSWER_SUCCESS,
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { ask };
