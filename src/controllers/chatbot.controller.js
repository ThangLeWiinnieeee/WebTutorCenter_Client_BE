const chatbotService = require("../services/chatbot.service");
const { successResponse } = require("../utils/response");
const HTTP_STATUS = require("../constants/status");
const MESSAGE = require("../constants/message");

const handleError = require("../utils/handleError");

// req.chatbotRequest được middleware buildChatbotRequest dựng sẵn (message + history +
// sessionId + user + authToken). Controller chỉ gọi service và trả data.
const ask = async (req, res, next) => {
  try {
    const data = await chatbotService.ask(req.chatbotRequest);

    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGE.CHATBOT_ANSWER_SUCCESS,
      data,
    });
  } catch (error) {
    handleError(error, res, next);
  }
};

module.exports = { ask };
